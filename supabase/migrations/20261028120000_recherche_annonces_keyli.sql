-- Keyli — Recherche d'annonces par filtres (Sprint 2, parcours chercheur)
--
-- Sources : docs/prd.md (filtres avancés : prix, type, quartier, pièces,
-- avantages/proximités — Must), docs/MODULES/annonces.md (recherche),
-- docs/DATABASE_LOGIC.md (catalogue des requêtes).
--
-- Décisions du porteur de projet du 2026-10-28 :
--   - tri par défaut : annonces VÉRIFIÉES d'abord, puis les plus récentes ;
--     tri par prix ou par date au choix ;
--   - filtres d'abord ; carte et recherche par rayon quand le jeton Mapbox
--     sera posé (avec leurs propres décisions) ;
--   - contact par la messagerie Keyli seule (le téléphone reste privé).
--
-- SECURITY INVOKER : la RLS de properties_keyli s'applique — seules les
-- annonces visibles du public remontent (non archivées, compte actif,
-- abonnement en cours).

-- Tri par défaut sur les annonces publiées (pilote : ~500 annonces)
create index idx_properties_publiees_tri
  on public.properties_keyli (is_verified desc, created_at desc)
  where archived_at is null;

create or replace function public.rechercher_annonces_keyli(
  p_statut      public.property_status_keyli default null,
  p_type        public.property_type_keyli default null,
  p_commune     uuid default null,
  p_quartier    uuid default null,
  p_prix_min    numeric default null,
  p_prix_max    numeric default null,
  p_pieces_min  integer default null,
  p_meuble      boolean default null,
  p_avantages   uuid[] default '{}',      -- l'annonce doit les avoir TOUS
  p_tri         text default 'pertinence', -- pertinence | recent | prix_croissant | prix_decroissant
  p_limite      integer default 20,
  p_decalage    integer default 0
)
returns table (
  id              uuid,
  titre           text,
  type            public.property_type_keyli,
  statut          public.property_status_keyli,
  prix            numeric,
  ville           text,
  quartier        text,
  commune         text,
  pieces          integer,
  salles_de_bain  integer,
  surface         numeric,
  meuble          boolean,
  image           text,
  verifiee        boolean,
  publiee_le      timestamptz,
  total           bigint                   -- nombre total de résultats (pagination)
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.title, p.type, p.status, p.price, p.city, q.nom, c.nom,
         p.rooms, p.bathrooms, p.area_m2, coalesce(p.furnished, false), p.main_image_url,
         coalesce(p.is_verified, false), p.created_at,
         count(*) over ()
    from public.properties_keyli p
    left join public.quartiers_keyli q on q.id = p.quartier_id
    left join public.communes_keyli c on c.id = q.commune_id
   where p.archived_at is null
     and (p_statut is null or p.status = p_statut)
     and (p_type is null or p.type = p_type)
     and (p_quartier is null or p.quartier_id = p_quartier)
     and (p_commune is null or q.commune_id = p_commune)
     and (p_prix_min is null or p.price >= p_prix_min)
     and (p_prix_max is null or p.price <= p_prix_max)
     and (p_pieces_min is null or p.rooms >= p_pieces_min)
     and (p_meuble is null or coalesce(p.furnished, false) = p_meuble)
     and (coalesce(cardinality(p_avantages), 0) = 0 or (
            select count(distinct pa.avantage_id)
              from public.property_avantages_keyli pa
             where pa.property_id = p.id and pa.avantage_id = any (p_avantages)
          ) = (select count(distinct a) from unnest(p_avantages) a))
   order by
     case when p_tri = 'pertinence' then coalesce(p.is_verified, false) end desc,
     case when p_tri = 'prix_croissant' then p.price end asc,
     case when p_tri = 'prix_decroissant' then p.price end desc,
     p.created_at desc,
     p.id
   limit least(greatest(coalesce(p_limite, 20), 1), 50)
  offset greatest(coalesce(p_decalage, 0), 0);
$$;

revoke execute on function public.rechercher_annonces_keyli(
  public.property_status_keyli, public.property_type_keyli, uuid, uuid, numeric, numeric,
  integer, boolean, uuid[], text, integer, integer
) from public;
grant execute on function public.rechercher_annonces_keyli(
  public.property_status_keyli, public.property_type_keyli, uuid, uuid, numeric, numeric,
  integer, boolean, uuid[], text, integer, integer
) to anon, authenticated;
