-- ============================================================
-- Dashboard Agence (Sprint 3bis, semaine 17)
-- ============================================================
-- Aucune table nouvelle : fonctions de lecture en SECURITY INVOKER (la RLS
-- limite chaque compte à ses annonces, ses leads, ses agents). Elles
-- servent aussi un propriétaire, mais l'écran est celui de l'agence.
--
-- Conseils (« insights ») — règles validées par le porteur le 2026-10-31,
-- des seuils fixes, pas un modèle IA (MODULES/dashboard.md) :
--   prix         : annonces à plus de 15 % du prix moyen FIABLE du quartier
--   opportunite  : quartier le plus recherché (30 j) sans aucune annonce
--                  en ligne de l'agence
--   reactivite   : leads « Nouveau » sans réponse depuis plus de 48 h
--                  (sinon félicitation si tout est traité)
-- ============================================================

-- ------------------------------------------------------------
-- Pipeline : leads en cours, et conclus depuis moins de 90 jours
-- ------------------------------------------------------------
create or replace function public.pipeline_leads_keyli()
returns table (
  id               uuid,
  etape            public.lead_stage_keyli,
  contact          text,
  contact_user_id  uuid,
  property_id      uuid,
  bien             text,
  agent_id         uuid,
  agent            text,
  derniere_activite timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.id, l.stage,
         coalesce(nullif(btrim(l.contact_nom), ''), pp.nom_affiche, 'Contact'),
         l.contact_user_id, l.property_id, coalesce(p.title, 'Annonce retirée'), l.agent_id, a.nom,
         coalesce(l.updated_at, l.created_at)
    from public.leads_keyli l
    left join public.properties_keyli p on p.id = l.property_id
    left join public.agency_agents_keyli a on a.id = l.agent_id
    left join public.profils_publics_keyli pp on pp.user_id = l.contact_user_id
   where l.owner_id = auth.uid()
     and (l.stage <> 'conclu' or coalesce(l.updated_at, l.created_at) > now() - interval '90 days')
   order by coalesce(l.updated_at, l.created_at) desc;
$$;

revoke execute on function public.pipeline_leads_keyli() from public, anon;
grant execute on function public.pipeline_leads_keyli() to authenticated;

-- ------------------------------------------------------------
-- Indicateurs de l'agence sur une période (7 à 90 jours)
-- ------------------------------------------------------------
-- Reprend les indicateurs du propriétaire (annonces, vues, contacts, série)
-- et ajoute leads, note moyenne et répartition des annonces.
create or replace function public.tableau_bord_agence_keyli(p_jours integer default 30)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_base   jsonb := public.tableau_bord_proprietaire_keyli(p_jours);
  v_jours  integer := (v_base ->> 'jours')::integer;
  v_debut  timestamptz := date_trunc('day', now()) - make_interval(days => v_jours - 1);
  v_prec   timestamptz := v_debut - make_interval(days => v_jours);
  v_uid    uuid := auth.uid();
begin
  return v_base || jsonb_build_object(
    'leads_actifs', (select count(*) from public.leads_keyli
                      where owner_id = v_uid and stage <> 'conclu'),
    'leads_nouveaux', (select count(*) from public.leads_keyli
                        where owner_id = v_uid and created_at >= v_debut),
    'leads_nouveaux_prec', (select count(*) from public.leads_keyli
                             where owner_id = v_uid and created_at >= v_prec and created_at < v_debut),
    'leads_conclus', (select count(*) from public.leads_keyli
                       where owner_id = v_uid and stage = 'conclu' and updated_at >= v_debut),
    'note_moyenne', (select round(avg(r.rating)::numeric, 1) from public.ratings_keyli r
                      where r.rated_user_id = v_uid),
    'nb_avis', (select count(*) from public.ratings_keyli r where r.rated_user_id = v_uid),
    'annonces_en_attente', (select count(*) from public.properties_keyli
                             where owner_id = v_uid and archived_at is null and not coalesce(is_verified, false)),
    'annonces_archivees', (select count(*) from public.properties_keyli
                            where owner_id = v_uid and archived_at is not null)
  );
end;
$$;

revoke execute on function public.tableau_bord_agence_keyli(integer) from public, anon;
grant execute on function public.tableau_bord_agence_keyli(integer) to authenticated;

-- ------------------------------------------------------------
-- Performance de l'équipe (agents internes, sans compte de connexion)
-- ------------------------------------------------------------
-- Conversion = part des leads reçus sur la période qui sont aujourd'hui
-- conclus. Note = moyenne des avis sur les biens attribués à l'agent
-- (MODULES/dashboard.md : l'agent n'a pas de profil propre).
create or replace function public.performance_equipe_keyli(p_jours integer default 30)
returns table (
  agent_id     uuid,
  nom          text,
  actif        boolean,
  annonces     integer,
  leads        integer,
  conclus      integer,
  conversion   integer,
  note         numeric,
  nb_avis      integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with periode as (
    select date_trunc('day', now()) - make_interval(days => least(greatest(coalesce(p_jours, 30), 7), 90) - 1) as debut
  )
  select a.id, a.nom, coalesce(a.actif, false),
         (select count(*)::integer from public.properties_keyli p
           where p.agent_id = a.id and p.archived_at is null),
         s.leads, s.conclus,
         case when s.leads > 0 then round(100.0 * s.conclus / s.leads)::integer end,
         (select round(avg(r.rating)::numeric, 1) from public.ratings_keyli r
            join public.properties_keyli p on p.id = r.property_id
           where p.agent_id = a.id),
         (select count(*)::integer from public.ratings_keyli r
            join public.properties_keyli p on p.id = r.property_id
           where p.agent_id = a.id)
    from public.agency_agents_keyli a
    cross join periode
    cross join lateral (
      select count(*)::integer as leads,
             count(*) filter (where l.stage = 'conclu')::integer as conclus
        from public.leads_keyli l
       where l.agent_id = a.id and l.created_at >= periode.debut
    ) s
   where a.agency_user_id = auth.uid()
   order by coalesce(a.actif, false) desc, s.conclus desc, a.nom;
$$;

revoke execute on function public.performance_equipe_keyli(integer) from public, anon;
grant execute on function public.performance_equipe_keyli(integer) to authenticated;

-- ------------------------------------------------------------
-- Conseils : toujours 3 lignes, dans l'ordre prix / opportunité / réactivité
-- ------------------------------------------------------------
create or replace function public.conseils_agence_keyli()
returns table (
  regle           text,
  type            text,     -- 'warn' | 'ok' | 'neutre' (InsightCard)
  titre           text,
  texte           text,
  action_libelle  text,
  action_vers     text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_ecarts     integer;
  v_reperes    integer;
  v_quartier   text;
  v_commune    text;
  v_attente    integer;
  v_nouveaux   integer;
begin
  -- 1. Prix à ajuster
  select count(*) filter (where abs(b.ecart_pct) > 15), count(*) filter (where b.prix_moyen is not null)
    into v_ecarts, v_reperes
    from public.mes_biens_marche_keyli() b;
  if v_ecarts > 0 then
    return query select 'prix', 'warn', 'Prix à ajuster',
      format('%s annonce%s s''écarte%s de plus de 15 %% du prix moyen de %s quartier.',
             v_ecarts, case when v_ecarts > 1 then 's' else '' end, case when v_ecarts > 1 then 'nt' else '' end,
             case when v_ecarts > 1 then 'leur' else 'son' end),
      'Revoir mes annonces', '/annonces';
  elsif v_reperes > 0 then
    return query select 'prix', 'ok', 'Prix cohérents',
      'Vos annonces sont dans la moyenne de leur quartier (écart de 15 % au plus).', null::text, null::text;
  else
    return query select 'prix', 'neutre', 'Repères de prix',
      'Les comparaisons apparaîtront dès que vos quartiers compteront au moins 5 annonces.', null::text, null::text;
  end if;

  -- 2. Opportunité : quartier le plus recherché sans annonce en ligne de l'agence
  select t.nom, c.nom into v_quartier, v_commune
    from public.quartiers_tendance_keyli t
    join public.communes_keyli c on c.id = t.commune_id
   where t.niveau = 'quartier' and t.score_popularite > 0
     and not exists (select 1 from public.properties_keyli p
                      where p.owner_id = v_uid and p.archived_at is null and p.quartier_id = t.zone_id)
   order by t.score_popularite desc, t.nom
   limit 1;
  if v_quartier is not null then
    return query select 'opportunite', 'neutre', 'Quartier à saisir',
      format('%s est l''un des quartiers les plus recherchés ce mois-ci et vous n''y avez aucune annonce.',
             case when v_commune is not null and v_commune <> v_quartier then v_quartier || ' (' || v_commune || ')' else v_quartier end),
      'Publier une annonce', '/annonces/nouvelle';
  else
    return query select 'opportunite', 'neutre', 'Bonne couverture',
      'Vous êtes présent dans tous les quartiers les plus recherchés du moment.', null::text, null::text;
  end if;

  -- 3. Réactivité : leads « Nouveau » de plus de 48 h sans réponse de l'agence
  select count(*) filter (where l.created_at < now() - interval '48 hours'
                            and not exists (select 1 from public.messages_keyli m
                                             where l.contact_user_id is not null
                                               and m.from_user = v_uid and m.to_user = l.contact_user_id
                                               and m.property_id = l.property_id
                                               and m.created_at >= l.created_at)),
         count(*)
    into v_attente, v_nouveaux
    from public.leads_keyli l
   where l.owner_id = v_uid and l.stage = 'nouveau';
  if v_attente > 0 then
    return query select 'reactivite', 'warn', 'Leads en attente',
      format('%s lead%s attend%s une réponse depuis plus de 48 h.', v_attente,
             case when v_attente > 1 then 's' else '' end, case when v_attente > 1 then 'ent' else '' end),
      'Voir le pipeline', '#pipeline';
  else
    return query select 'reactivite', 'ok', 'Bonne réactivité',
      case when v_nouveaux > 0 then 'Tous vos nouveaux leads ont reçu une réponse en moins de 48 h.'
           else 'Aucun lead en attente : continuez à répondre vite, c''est ce qui fait conclure.' end,
      null::text, null::text;
  end if;
end;
$$;

revoke execute on function public.conseils_agence_keyli() from public, anon;
grant execute on function public.conseils_agence_keyli() to authenticated;

-- Leads d'un agent (performance de l'équipe)
create index if not exists idx_leads_agent_date on public.leads_keyli (agent_id, created_at) where agent_id is not null;
