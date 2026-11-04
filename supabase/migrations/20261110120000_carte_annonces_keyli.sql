-- ============================================================
-- Carte du catalogue : positions approximatives (2026-11-04)
-- Décision du porteur : la carte publique montre une zone, jamais la
-- position exacte d'un bien (protection des propriétaires : cambriolage,
-- démarchage). L'adresse se donne ensuite par la messagerie.
--
-- 1. La position exacte (geolocation) n'est plus lisible depuis le client :
--    jusqu'ici, le droit de lecture portait sur toute la table, donc
--    n'importe quel visiteur pouvait lire le point GPS d'une annonce
--    publiée par l'API. Lecture désormais accordée colonne par colonne.
--    ⚠️ Toute nouvelle colonne de properties_keyli devra être ajoutée à ce
--    grant pour être lisible (docs/DATABASE.md).
-- 2. positions_annonces_keyli(ids) : position arrondie dans une case
--    d'environ 450 m, plus un léger décalage propre à chaque annonce pour
--    que deux biens d'une même case ne se superposent pas. L'arrondi fait
--    perdre l'information : on ne peut pas retrouver le point exact.
-- ============================================================

revoke select on public.properties_keyli from anon, authenticated;
grant select (id, owner_id, agent_id, title, type, status, price, description, city,
              quartier_id, area_m2, rooms, bathrooms, furnished, video_url,
              main_image_url, is_verified, views_count, contacts_count, archived_at,
              created_at, updated_at, accepte_depassement, sejour_court, nuits_min,
              voyageurs_max)
  on public.properties_keyli to anon, authenticated;

-- Taille de la case (en degrés) : 0,004° ≈ 445 m à la latitude d'Abidjan
create or replace function public.position_approchee_keyli(p_id uuid, p_geo extensions.geography)
returns table (latitude double precision, longitude double precision)
language sql
immutable
set search_path = ''
as $$
  with base as (
    select extensions.st_y(p_geo::extensions.geometry) as lat,
           extensions.st_x(p_geo::extensions.geometry) as lng,
           md5(p_id::text) as h
  ),
  -- Deux nombres entre 0 et 1 tirés de l'identifiant (stables d'un appel à l'autre)
  alea as (
    select lat, lng,
           ('x' || substr(h, 1, 7))::bit(28)::int / 268435455.0 as a,
           ('x' || substr(h, 8, 7))::bit(28)::int / 268435455.0 as b
      from base
  )
  select (floor(lat / 0.004) * 0.004 + 0.002 + (a - 0.5) * 0.0024)::double precision,
         (floor(lng / 0.004) * 0.004 + 0.002 + (b - 0.5) * 0.0024)::double precision
    from alea;
$$;

revoke execute on function public.position_approchee_keyli(uuid, extensions.geography)
  from public, anon, authenticated;

-- Positions approximatives des annonces affichées (page de résultats :
-- 50 au plus), uniquement pour les annonces publiées.
create or replace function public.positions_annonces_keyli(p_ids uuid[])
returns table (id uuid, latitude double precision, longitude double precision)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, pos.latitude, pos.longitude
    from public.properties_keyli p
   cross join lateral public.position_approchee_keyli(p.id, p.geolocation) pos
   where p.id = any (p_ids[1:50])
     and p.archived_at is null;
$$;

revoke execute on function public.positions_annonces_keyli(uuid[]) from public;
grant execute on function public.positions_annonces_keyli(uuid[]) to anon, authenticated;

-- ------------------------------------------------------------
-- Recommandations « Pour vous » (20261103120000) : elle lisait toutes les
-- colonnes (p.*), position exacte comprise. Même fonction, colonnes nommées.
-- ------------------------------------------------------------
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
    -- Colonnes nommées : la position exacte (geolocation) n'est plus lisible
    select p.id, p.title, p.type, p.status, p.price, p.city, p.quartier_id, p.main_image_url,
           p.is_verified, p.created_at, q.nom as nom_quartier, c.nom as nom_commune,
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
-- Mes alertes (20261103120000) : le comptage passe la ligne entière de
-- l'annonce à annonce_correspond_alerte_keyli (critère de rayon compris).
-- Exécutée avec les droits de la base : elle ne compte que des annonces
-- publiques et ne lit que les alertes de l'appelant (a.user_id = auth.uid()),
-- et ne renvoie jamais de position.
-- ------------------------------------------------------------
alter function public.mes_alertes_keyli() security definer;
