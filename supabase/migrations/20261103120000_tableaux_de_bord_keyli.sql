-- ============================================================
-- Tableaux de bord Propriétaire et Chercheur (Sprint 3bis, semaine 16)
-- ============================================================
-- Aucune table nouvelle : des fonctions de lecture qui composent les
-- données existantes. Toutes en SECURITY INVOKER (la RLS décide de ce qui
-- est visible), sauf preferences_chercheur_keyli qui lit les interactions
-- de l'appelant — table que la RLS ne lui ouvre pas — et ne renvoie que
-- des agrégats le concernant.
--
-- Score de pertinence des recommandations (règle validée par le porteur le
-- 2026-10-30, MODULES/dashboard.md) : rapprocher chaque annonce des
-- recherches passées et des favoris du chercheur — même quartier, même
-- type, fourchette de prix — avec un bonus pour les annonces vérifiées.
--   quartier 40 pts + type 25 pts + prix 20 pts + vérifiée 15 pts = 100
-- Signaux (90 derniers jours sauf favoris et alertes actives) :
--   favori ×3, alerte active ×2, annonce consultée ×1, quartier recherché ×1
-- ============================================================

-- Signaux d'un chercheur (consultations, quartiers recherchés) : par compte
create index idx_interactions_utilisateur
  on public.property_interactions_keyli (user_id, interaction_type, created_at desc)
  where user_id is not null;

-- ------------------------------------------------------------
-- Préférences du chercheur connecté (agrégats uniquement)
-- ------------------------------------------------------------
create or replace function public.preferences_chercheur_keyli()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with
  moi as (select auth.uid() as uid),
  -- Annonces signalées par le chercheur (favoris ×3, consultations ×1)
  biens as (
    select f.property_id, 3::numeric as poids
      from public.favorites_keyli f, moi
     where f.user_id = moi.uid
    union all
    select distinct i.property_id, 1::numeric
      from public.property_interactions_keyli i, moi
     where i.user_id = moi.uid
       and i.interaction_type = 'view'
       and i.property_id is not null
       and i.created_at > now() - interval '90 days'
  ),
  biens_detail as (
    select p.quartier_id, p.type::text as type, p.status::text as statut, p.price, b.poids
      from biens b
      join public.properties_keyli p on p.id = b.property_id
     where p.owner_id <> (select uid from moi)
  ),
  alertes as (
    select a.criteres
      from public.search_alerts_keyli a, moi
     where a.user_id = moi.uid and a.actif
  ),
  quartiers as (
    select quartier_id, sum(poids) as poids from (
      select quartier_id, poids from biens_detail where quartier_id is not null
      union all
      select (criteres ->> 'quartier_id')::uuid, 2 from alertes where criteres ? 'quartier_id'
      union all
      select i.quartier_id, 1
        from public.property_interactions_keyli i, moi
       where i.user_id = moi.uid
         and i.interaction_type = 'search_neighborhood'
         and i.quartier_id is not null
         and i.created_at > now() - interval '90 days'
    ) s group by quartier_id
  ),
  types as (
    select type, sum(poids) as poids from (
      select type, poids from biens_detail
      union all
      select criteres ->> 'type', 2 from alertes where criteres ? 'type'
    ) s group by type
  ),
  -- Prix de référence par statut : médiane des biens signalés, et des
  -- plafonds d'alerte quand le statut y est précisé
  prix as (
    select statut, percentile_cont(0.5) within group (order by price) as mediane from (
      select statut, price from biens_detail
      union all
      select criteres ->> 'status', (criteres ->> 'prix_max')::numeric
        from alertes where criteres ? 'status' and criteres ? 'prix_max'
    ) s group by statut
  )
  select jsonb_build_object(
    'signaux', (select count(*) from biens_detail) + (select count(*) from alertes),
    'quartiers', coalesce((select jsonb_object_agg(quartier_id, poids) from quartiers), '{}'::jsonb),
    'types', coalesce((select jsonb_object_agg(type, poids) from types), '{}'::jsonb),
    'prix', coalesce((select jsonb_object_agg(statut, mediane) from prix), '{}'::jsonb),
    'quartiers_recherches', (select count(*) from quartiers)
  );
$$;

revoke execute on function public.preferences_chercheur_keyli() from public, anon;
grant execute on function public.preferences_chercheur_keyli() to authenticated;

-- ------------------------------------------------------------
-- Recommandations « Pour vous »
-- ------------------------------------------------------------
-- Annonces visibles (RLS), hors les siennes et ses favoris. Sans aucun
-- signal (nouveau compte) : annonces récentes, vérifiées d'abord, sans
-- score (pertinence NULL — l'interface ne l'affiche pas).
create or replace function public.recommandations_keyli(p_limite integer default 10)
returns table (
  id          uuid,
  titre       text,
  type        public.property_type_keyli,
  statut      public.property_status_keyli,
  prix        numeric,
  ville       text,
  quartier    text,
  commune     text,
  image       text,
  verifiee    boolean,
  pertinence  integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_pref     jsonb := public.preferences_chercheur_keyli();
  v_max_q    numeric;
  v_max_t    numeric;
  v_limite   integer := least(greatest(coalesce(p_limite, 10), 1), 30);
  v_signaux  boolean;
begin
  select max(value::numeric) into v_max_q from jsonb_each_text(v_pref -> 'quartiers');
  select max(value::numeric) into v_max_t from jsonb_each_text(v_pref -> 'types');
  v_signaux := v_max_q is not null or v_max_t is not null or (v_pref -> 'prix') <> '{}'::jsonb;

  return query
  with candidats as (
    select p.*, q.nom as nom_quartier, c.nom as nom_commune,
           (v_pref -> 'prix' ->> p.status::text)::numeric as mediane
      from public.properties_keyli p
      left join public.quartiers_keyli q on q.id = p.quartier_id
      left join public.communes_keyli c on c.id = q.commune_id
     where p.archived_at is null
       and p.owner_id <> auth.uid()
       and not exists (select 1 from public.favorites_keyli f
                        where f.user_id = auth.uid() and f.property_id = p.id)
  ),
  notes as (
    select k.*,
      case when not v_signaux then null else round(
          40 * coalesce((v_pref -> 'quartiers' ->> k.quartier_id::text)::numeric / nullif(v_max_q, 0), 0)
        + 25 * coalesce((v_pref -> 'types' ->> k.type::text)::numeric / nullif(v_max_t, 0), 0)
        + 20 * case
                 when k.mediane is null or k.mediane <= 0 then 0
                 when abs(k.price - k.mediane) / k.mediane <= 0.25 then 1
                 when abs(k.price - k.mediane) / k.mediane >= 0.60 then 0
                 else 1 - (abs(k.price - k.mediane) / k.mediane - 0.25) / 0.35
               end
        + 15 * (case when coalesce(k.is_verified, false) then 1 else 0 end)
      )::integer end as score
      from candidats k
  )
  select n.id, n.title, n.type, n.status, n.price, n.city, n.nom_quartier, n.nom_commune,
         n.main_image_url, coalesce(n.is_verified, false), n.score
    from notes n
   -- Avec des signaux, on écarte ce qui ne ressemble à rien de recherché
   where n.score is null or n.score >= 30
   order by n.score desc nulls last, coalesce(n.is_verified, false) desc, n.created_at desc
   limit v_limite;
end;
$$;

revoke execute on function public.recommandations_keyli(integer) from public, anon;
grant execute on function public.recommandations_keyli(integer) to authenticated;

-- ------------------------------------------------------------
-- Indicateurs du propriétaire (ou de l'agence) sur une période
-- ------------------------------------------------------------
-- Vues : interactions « view » sur ses annonces (policy « Propriétaire lit
-- les interactions de ses biens »). Contacts : personnes distinctes qui lui
-- ont écrit, par bien. Période précédente de même durée pour la variation,
-- série quotidienne des vues pour le mini-graphique.
create or replace function public.tableau_bord_proprietaire_keyli(p_jours integer default 30)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_jours  integer := least(greatest(coalesce(p_jours, 30), 7), 90);
  v_debut  timestamptz := date_trunc('day', now()) - make_interval(days => v_jours - 1);
  v_prec   timestamptz := v_debut - make_interval(days => v_jours);
  v_uid    uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;

  return (
    with vues as (
      select i.created_at
        from public.property_interactions_keyli i
        join public.properties_keyli p on p.id = i.property_id
       where p.owner_id = v_uid
         and i.interaction_type = 'view'
         and i.created_at >= v_prec
    ),
    contacts as (
      select distinct on (m.from_user, m.property_id) m.created_at
        from public.messages_keyli m
       where m.to_user = v_uid and m.created_at >= v_prec
       order by m.from_user, m.property_id, m.created_at
    ),
    jours as (
      select generate_series(v_debut, date_trunc('day', now()), interval '1 day') as jour
    )
    select jsonb_build_object(
      'jours', v_jours,
      'annonces_actives', (select count(*) from public.properties_keyli
                            where owner_id = v_uid and archived_at is null),
      'annonces_verifiees', (select count(*) from public.properties_keyli
                              where owner_id = v_uid and archived_at is null and is_verified),
      'vues', (select count(*) from vues where created_at >= v_debut),
      'vues_prec', (select count(*) from vues where created_at < v_debut),
      'contacts', (select count(*) from contacts where created_at >= v_debut),
      'contacts_prec', (select count(*) from contacts where created_at < v_debut),
      'serie_vues', (select jsonb_agg(
                        (select count(*) from vues v
                          where v.created_at >= j.jour and v.created_at < j.jour + interval '1 day')
                        order by j.jour)
                       from jours j)
    )
  );
end;
$$;

revoke execute on function public.tableau_bord_proprietaire_keyli(integer) from public, anon;
grant execute on function public.tableau_bord_proprietaire_keyli(integer) to authenticated;

-- ------------------------------------------------------------
-- Mes biens face au prix moyen de leur quartier
-- ------------------------------------------------------------
-- Prix moyen issu de quartiers_tendance_keyli (calcul nocturne), retenu
-- seulement s'il est fiable (au moins 5 annonces sur la période).
create or replace function public.mes_biens_marche_keyli()
returns table (
  id               uuid,
  titre            text,
  statut           public.property_status_keyli,
  prix             numeric,
  verifiee         boolean,
  vues             integer,
  quartier         text,
  prix_moyen       numeric,
  ecart_pct        numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.title, p.status, p.price, coalesce(p.is_verified, false), coalesce(p.views_count, 0),
         q.nom, m.moyen,
         case when m.moyen > 0 then round((p.price - m.moyen) / m.moyen * 100, 1) end
    from public.properties_keyli p
    left join public.quartiers_keyli q on q.id = p.quartier_id
    left join lateral (
      select case when p.status = 'a_louer' then t.prix_moyen_location else t.prix_moyen_vente end as moyen
        from public.quartiers_tendance_keyli t
       where t.niveau = 'quartier' and t.zone_id = p.quartier_id and t.prix_fiable
    ) m on true
   where p.owner_id = auth.uid() and p.archived_at is null
   order by p.created_at desc;
$$;

revoke execute on function public.mes_biens_marche_keyli() from public, anon;
grant execute on function public.mes_biens_marche_keyli() to authenticated;

-- ------------------------------------------------------------
-- Mes alertes et leurs nouveautés (annonces visibles des 7 derniers jours)
-- ------------------------------------------------------------
create or replace function public.mes_alertes_keyli()
returns table (
  id          uuid,
  criteres    jsonb,
  actif       boolean,
  quartier    text,
  commune     text,
  nouvelles   integer,
  created_at  timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.id, a.criteres, coalesce(a.actif, false),
         q.nom, coalesce(cq.nom, c.nom),
         (select count(*)::integer from public.properties_keyli p
           where p.archived_at is null
             and p.owner_id <> auth.uid()
             and p.created_at > now() - interval '7 days'
             and public.annonce_correspond_alerte_keyli(p, a.criteres)),
         a.created_at
    from public.search_alerts_keyli a
    left join public.quartiers_keyli q on q.id = (a.criteres ->> 'quartier_id')::uuid
    left join public.communes_keyli cq on cq.id = q.commune_id
    left join public.communes_keyli c on c.id = (a.criteres ->> 'commune_id')::uuid
   where a.user_id = auth.uid()
   order by a.actif desc, a.created_at desc;
$$;

revoke execute on function public.mes_alertes_keyli() from public, anon;
grant execute on function public.mes_alertes_keyli() to authenticated;

-- ------------------------------------------------------------
-- Visites à venir (planifiées par moi, ou dont je suis le visiteur)
-- ------------------------------------------------------------
create or replace function public.mes_visites_a_venir_keyli(p_limite integer default 5)
returns table (
  id             uuid,
  property_id    uuid,
  titre          text,
  scheduled_at   timestamptz,
  status         public.visit_status_keyli,
  interlocuteur  uuid,
  nom            text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.id, v.property_id, coalesce(p.title, 'Annonce retirée'), v.scheduled_at, v.status,
         case when v.scheduled_by = auth.uid() then v.visitor_user_id else v.scheduled_by end,
         case when v.scheduled_by = auth.uid()
              then coalesce(pv.nom_affiche, v.visitor_nom, 'Visiteur')
              else coalesce(po.nom_affiche, 'Propriétaire') end
    from public.visits_keyli v
    left join public.properties_keyli p on p.id = v.property_id
    left join public.profils_publics_keyli pv on pv.user_id = v.visitor_user_id
    left join public.profils_publics_keyli po on po.user_id = v.scheduled_by
   where (v.scheduled_by = auth.uid() or v.visitor_user_id = auth.uid())
     and v.scheduled_at >= date_trunc('day', now())
   order by v.scheduled_at
   limit least(greatest(coalesce(p_limite, 5), 1), 20);
$$;

revoke execute on function public.mes_visites_a_venir_keyli(integer) from public, anon;
grant execute on function public.mes_visites_a_venir_keyli(integer) to authenticated;
