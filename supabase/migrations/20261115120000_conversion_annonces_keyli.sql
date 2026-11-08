-- ============================================================
-- Sprint 8 — optimisation de la conversion (2026-11-08)
-- Décision du porteur : mesure de la conversion, fiche annonce plus
-- efficace, qualité des annonces, statistiques annonceur
-- (docs/MODULES/conversion.md). Aucune table nouvelle : tout se calcule à
-- partir de property_interactions_keyli (vues, intentions de contact) et
-- de messages_keyli (prises de contact réelles).
--
-- Définitions communes (mêmes chiffres partout) :
--  - visiteurs  : couples distincts (session, annonce) ayant une vue sur la
--                 période ;
--  - intentions : couples distincts (session, annonce) ayant un clic
--                 « contacter » (click_contact) sur la période ;
--  - contacts   : premiers messages d'un utilisateur à l'annonceur au sujet
--                 d'une annonce, envoyés sur la période (un même chercheur
--                 compte une fois par annonce, à son premier message).
--  - taux       : contacts / visiteurs (calculé à l'affichage).
--
-- 1. conversion_annonces_keyli(début, fin) : admin, total + par commune +
--    par type de bien.
-- 2. performance_mes_annonces_keyli(jours) : annonceur, par annonce active,
--    avec les critères de qualité de chaque annonce.
-- 3. annonces_similaires_keyli(annonce, limite) : public, bas de fiche.
-- ============================================================

-- ---------- 1. Mesure de la conversion (admin) ----------
create or replace function public.conversion_annonces_keyli(p_debut date, p_fin date)
returns table (
  dimension   text,      -- 'total' | 'commune' | 'type'
  cle         text,      -- nom de la commune, valeur du type ; null pour le total
  visiteurs   bigint,
  intentions  bigint,
  contacts    bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_debut timestamptz;
  v_fin   timestamptz;
begin
  if not public.est_admin_keyli() then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  if p_debut is null or p_fin is null or p_fin < p_debut or p_fin - p_debut > 366 then
    raise exception 'Période invalide (un an au plus).' using errcode = '22023';
  end if;
  -- Bornes en heure d'Abidjan (UTC) : du début du premier jour à la fin du dernier
  v_debut := p_debut::timestamptz;
  v_fin   := (p_fin + 1)::timestamptz;

  return query
  with vues as (
    select distinct i.session_id, i.property_id
      from public.property_interactions_keyli i
     where i.interaction_type = 'view' and i.created_at >= v_debut and i.created_at < v_fin
  ),
  intentions as (
    select distinct i.session_id, i.property_id
      from public.property_interactions_keyli i
     where i.interaction_type = 'click_contact' and i.created_at >= v_debut and i.created_at < v_fin
  ),
  premiers as (
    select m.property_id, m.from_user, min(m.created_at) as le
      from public.messages_keyli m
      join public.properties_keyli p on p.id = m.property_id
     where m.from_user <> p.owner_id
     group by m.property_id, m.from_user
  ),
  contacts as (
    select pr.property_id from premiers pr where pr.le >= v_debut and pr.le < v_fin
  ),
  evenements as (
    select v.property_id, 1 as vu, 0 as intention, 0 as contact from vues v
    union all select it.property_id, 0, 1, 0 from intentions it
    union all select c.property_id, 0, 0, 1 from contacts c
  ),
  detail as (
    select e.vu, e.intention, e.contact, coalesce(co.nom, 'Commune non renseignée') as commune, p.type::text as type
      from evenements e
      join public.properties_keyli p on p.id = e.property_id
      left join public.quartiers_keyli q on q.id = p.quartier_id
      left join public.communes_keyli co on co.id = q.commune_id
  )
  select 'total'::text, null::text, sum(d.vu)::bigint, sum(d.intention)::bigint, sum(d.contact)::bigint
    from detail d
  union all
  select 'commune', d.commune, sum(d.vu)::bigint, sum(d.intention)::bigint, sum(d.contact)::bigint
    from detail d group by d.commune
  union all
  select 'type', d.type, sum(d.vu)::bigint, sum(d.intention)::bigint, sum(d.contact)::bigint
    from detail d group by d.type;
end;
$$;

revoke execute on function public.conversion_annonces_keyli(date, date) from public, anon;
grant execute on function public.conversion_annonces_keyli(date, date) to authenticated;

-- ---------- 2. Statistiques et qualité, par annonce (annonceur) ----------
-- Annonces non archivées de l'appelant. Les critères de qualité sont des
-- faits (renseigné ou non, nombre de photos) ; le score et les conseils
-- sont un repère d'affichage calculé par l'écran, pas une règle métier.
create or replace function public.performance_mes_annonces_keyli(p_jours integer default 30)
returns table (
  id               uuid,
  titre            text,
  publiee_le       timestamptz,
  visiteurs        bigint,
  intentions       bigint,
  contacts         bigint,
  nb_photos        integer,
  a_description    boolean,
  a_quartier       boolean,
  a_surface        boolean,
  a_pieces         boolean,
  a_position       boolean,
  annonceur_verifie boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_debut timestamptz;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  v_debut := date_trunc('day', now()) - make_interval(days => least(greatest(coalesce(p_jours, 30), 7), 90) - 1);

  return query
  select p.id, p.title, p.created_at,
         (select count(distinct i.session_id) from public.property_interactions_keyli i
           where i.property_id = p.id and i.interaction_type = 'view' and i.created_at >= v_debut),
         (select count(distinct i.session_id) from public.property_interactions_keyli i
           where i.property_id = p.id and i.interaction_type = 'click_contact' and i.created_at >= v_debut),
         (select count(*) from (
            select m.from_user from public.messages_keyli m
             where m.property_id = p.id and m.from_user <> p.owner_id
             group by m.from_user
            having min(m.created_at) >= v_debut) premiers),
         (select count(*)::integer from public.property_media_keyli pm
           where pm.property_id = p.id and pm.media_type = 'image'),
         nullif(btrim(p.description), '') is not null,
         p.quartier_id is not null,
         p.area_m2 is not null,
         p.rooms is not null,
         p.geolocation is not null,
         coalesce((select pf.verified from public.profiles_keyli pf where pf.user_id = p.owner_id), false)
    from public.properties_keyli p
   where p.owner_id = v_uid and p.archived_at is null
   order by p.created_at desc;
end;
$$;

revoke execute on function public.performance_mes_annonces_keyli(integer) from public, anon;
grant execute on function public.performance_mes_annonces_keyli(integer) to authenticated;

-- ---------- 3. Annonces similaires (fiche annonce) ----------
-- Même nature (location, vente, séjour court) et même type ou même commune,
-- classées par proximité : même quartier, même commune, même type, puis
-- prix le plus proche. Security invoker : seules les annonces visibles par
-- l'appelant (règle de lecture publique) sont proposées.
create or replace function public.annonces_similaires_keyli(p_id uuid, p_limite integer default 4)
returns table (
  id            uuid,
  titre         text,
  type          public.property_type_keyli,
  statut        public.property_status_keyli,
  prix          numeric,
  ville         text,
  quartier      text,
  commune       text,
  pieces        integer,
  image         text,
  verifiee      boolean,
  sejour_court  boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with ref as (
    select p.id, p.type, p.status, p.sejour_court, p.price, p.quartier_id, q.commune_id
      from public.properties_keyli p
      left join public.quartiers_keyli q on q.id = p.quartier_id
     where p.id = p_id and p.archived_at is null
  )
  select p.id, p.title, p.type, p.status, p.price, p.city, q.nom, c.nom, p.rooms, p.main_image_url,
         coalesce(p.is_verified, false), p.sejour_court
    from ref r
    join public.properties_keyli p
      on p.id <> r.id and p.archived_at is null
     and p.status = r.status and p.sejour_court = r.sejour_court
    left join public.quartiers_keyli q on q.id = p.quartier_id
    left join public.communes_keyli c on c.id = q.commune_id
   where p.type = r.type or (r.commune_id is not null and q.commune_id = r.commune_id)
   order by (p.quartier_id is not distinct from r.quartier_id and r.quartier_id is not null) desc,
            (q.commune_id is not distinct from r.commune_id and r.commune_id is not null) desc,
            (p.type = r.type) desc,
            abs(p.price - r.price) / greatest(r.price, 1),
            p.created_at desc
   limit least(greatest(coalesce(p_limite, 4), 1), 8);
$$;

revoke execute on function public.annonces_similaires_keyli(uuid, integer) from public;
grant execute on function public.annonces_similaires_keyli(uuid, integer) to anon, authenticated;
