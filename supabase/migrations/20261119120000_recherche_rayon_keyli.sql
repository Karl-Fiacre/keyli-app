-- ============================================================
-- Recherche par rayon autour de la position de l'utilisateur (2026-11-14)
-- Promesse produit (docs/PRD_REGLES.md, géolocalisation). Décisions du
-- porteur (2026-11-14) :
--   - rayons proposés 1, 3, 5, 10 km, 5 par défaut (l'interface) ; la base
--     accepte de 0,5 à 20 km ;
--   - le rayon REMPLACE les filtres commune et quartier (ignorés quand un
--     rayon est donné) ; prix, type, pièces, meublé, etc. restent cumulés ;
--   - chaque résultat porte une distance ARRONDIE (« à environ 2 km ») ;
--   - web et mobile utilisent la même fonction.
--
-- Protection de la position exacte (migration 20261110120000) : filtre ET
-- distance sont calculés sur la position APPROXIMATIVE (case ≈ 450 m,
-- position_approchee_keyli), comme la carte. Sinon, en déplaçant le centre
-- de recherche et en notant quand une annonce entre ou sort du cercle, on
-- retrouverait son point exact. La position exacte sert seulement à
-- présélectionner les biens avec l'index GiST (ST_DWithin), avec une marge
-- de 700 m supérieure à l'écart maximal entre position exacte et approchée
-- (≈ 500 m).
-- ============================================================

-- ------------------------------------------------------------
-- Annonces publiées dans un rayon (km) autour d'un point, avec leur
-- distance arrondie au demi-kilomètre (0,5 km au minimum). Exécutée avec
-- les droits de la base pour lire geolocation, que le client ne lit plus ;
-- ne renvoie jamais de position.
-- ------------------------------------------------------------
create or replace function public.annonces_autour_keyli(
  p_lat       double precision,
  p_lng       double precision,
  p_rayon_km  numeric
)
returns table (id uuid, distance_km numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with centre as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g,
           least(greatest(coalesce(p_rayon_km, 5), 0.5), 20) * 1000 as rayon_m
     where p_lat between -90 and 90 and p_lng between -180 and 180
  )
  select p.id, greatest(0.5, round((d.metres / 1000.0) * 2) / 2)::numeric
    from public.properties_keyli p
   cross join centre c
   cross join lateral public.position_approchee_keyli(p.id, p.geolocation) pos
   cross join lateral (
     select extensions.st_distance(
              extensions.st_setsrid(extensions.st_makepoint(pos.longitude, pos.latitude), 4326)::extensions.geography,
              c.g) as metres
   ) d
   where p.archived_at is null
     -- Présélection par l'index GiST, avec marge (voir en-tête)
     and extensions.st_dwithin(p.geolocation, c.g, c.rayon_m + 700)
     -- Filtre réel : sur la position approchée
     and d.metres <= c.rayon_m;
$$;

revoke execute on function public.annonces_autour_keyli(double precision, double precision, numeric) from public;
grant execute on function public.annonces_autour_keyli(double precision, double precision, numeric)
  to anon, authenticated;

-- ------------------------------------------------------------
-- Recherche : trois paramètres (p_lat, p_lng, p_rayon_km) et une colonne
-- distance_km en plus. Le type de retour change : la fonction est
-- supprimée puis recréée (les appels par paramètres nommés restent valides).
-- ------------------------------------------------------------
drop function public.rechercher_annonces_keyli(
  public.property_status_keyli, public.property_type_keyli, uuid, uuid, numeric, numeric,
  integer, boolean, uuid[], text, integer, integer, boolean, date, date, integer
);

create function public.rechercher_annonces_keyli(
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
  p_decalage    integer default 0,
  p_sejour      boolean default null,     -- true : séjours courts seulement
  p_arrivee     date default null,        -- avec p_depart : libres sur toutes ces nuits
  p_depart      date default null,
  p_voyageurs   integer default null,
  p_lat         double precision default null, -- avec p_lng et p_rayon_km : recherche par rayon
  p_lng         double precision default null,
  p_rayon_km    numeric default null
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
  sejour_court    boolean,
  nuits_min       integer,
  distance_km     numeric,                 -- arrondie ; null sans recherche par rayon
  total           bigint                   -- nombre total de résultats (pagination)
)
language sql
stable
security invoker
set search_path = ''
as $$
  with autour as (
    select a.id, a.distance_km
      from public.annonces_autour_keyli(p_lat, p_lng, p_rayon_km) a
     where p_rayon_km is not null
  )
  select p.id, p.title, p.type, p.status, p.price, p.city, q.nom, c.nom,
         p.rooms, p.bathrooms, p.area_m2, coalesce(p.furnished, false), p.main_image_url,
         coalesce(p.is_verified, false), p.created_at, p.sejour_court, p.nuits_min,
         z.distance_km,
         count(*) over ()
    from public.properties_keyli p
    left join public.quartiers_keyli q on q.id = p.quartier_id
    left join public.communes_keyli c on c.id = q.commune_id
    left join autour z on z.id = p.id
   where p.archived_at is null
     -- Rayon : seules les annonces du cercle ; il remplace commune et quartier
     and (p_rayon_km is null or z.id is not null)
     and (p_statut is null or p.status = p_statut)
     and (p_type is null or p.type = p_type)
     and (p_rayon_km is not null or p_quartier is null or p.quartier_id = p_quartier)
     and (p_rayon_km is not null or p_commune is null or q.commune_id = p_commune)
     and (p_prix_min is null or p.price >= p_prix_min)
     and (p_prix_max is null or p.price <= p_prix_max)
     and (p_pieces_min is null or p.rooms >= p_pieces_min)
     and (p_meuble is null or coalesce(p.furnished, false) = p_meuble)
     and (coalesce(cardinality(p_avantages), 0) = 0 or (
            select count(distinct pa.avantage_id)
              from public.property_avantages_keyli pa
             where pa.property_id = p.id and pa.avantage_id = any (p_avantages)
          ) = (select count(distinct a) from unnest(p_avantages) a))
     and (p_sejour is null or p.sejour_court = p_sejour)
     -- Dates : séjour court, durée minimum respectée, au moins une unité libre
     -- chaque nuit et assez de place pour les voyageurs
     and (p_arrivee is null or p_depart is null or (
            p.sejour_court and p_depart > p_arrivee and p_depart - p_arrivee >= p.nuits_min
            and (
              (not public.est_hotelier_keyli(p.type)
                and (p_voyageurs is null or p.voyageurs_max is null or p.voyageurs_max >= p_voyageurs)
                and not exists (select 1 from public.occupation_sejour_keyli(p.id, null, p_arrivee, p_depart) o
                                 where o.occupees >= o.capacite))
              or
              (public.est_hotelier_keyli(p.type) and exists (
                 select 1 from public.types_chambres_keyli t
                  where t.property_id = p.id and t.actif
                    and (p_voyageurs is null or t.voyageurs_max >= p_voyageurs)
                    and (select min(o.capacite - o.occupees)
                           from public.occupation_sejour_keyli(p.id, t.id, p_arrivee, p_depart) o) >= 1))
            )))
   order by
     case when p_tri = 'pertinence' then coalesce(p.is_verified, false) end desc,
     case when p_tri = 'prix_croissant' then p.price end asc,
     case when p_tri = 'prix_decroissant' then p.price end desc,
     -- Recherche par rayon : à tri égal, les plus proches d'abord
     case when p_tri in ('pertinence', 'prix_croissant', 'prix_decroissant') then z.distance_km end asc nulls last,
     p.created_at desc,
     p.id
   limit least(greatest(coalesce(p_limite, 20), 1), 50)
  offset greatest(coalesce(p_decalage, 0), 0);
$$;

revoke execute on function public.rechercher_annonces_keyli(
  public.property_status_keyli, public.property_type_keyli, uuid, uuid, numeric, numeric,
  integer, boolean, uuid[], text, integer, integer, boolean, date, date, integer,
  double precision, double precision, numeric
) from public;
grant execute on function public.rechercher_annonces_keyli(
  public.property_status_keyli, public.property_type_keyli, uuid, uuid, numeric, numeric,
  integer, boolean, uuid[], text, integer, integer, boolean, date, date, integer,
  double precision, double precision, numeric
) to anon, authenticated;
