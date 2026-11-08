-- ============================================================
-- Sprint 11-12 — disponibilité exacte dans la recherche (2026-11-08)
-- Bug trouvé par l'audit des droits (docs/MODULES/stabilisation-pre-mobile.md) :
-- rechercher_annonces_keyli (security invoker) lisait reservations_keyli
-- directement pour exclure les logements déjà réservés. Or la RLS ne montre
-- à un visiteur aucune réservation, et à un compte connecté que les siennes :
-- un logement réservé par quelqu'un d'autre apparaissait donc « libre » sur
-- les dates demandées.
-- Correction : le test passe par occupation_sejour_keyli (security definer,
-- ne renvoie que des nombres, jamais qui a réservé), déjà utilisé pour les
-- chambres d'hôtel. La recherche n'a plus besoin de lire la table : les
-- visiteurs n'y ont plus aucun droit (migration 20261117120000).
-- Même signature, même type de retour : simple remplacement du corps.
-- ============================================================

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
  p_decalage    integer default 0,
  p_sejour      boolean default null,     -- true : séjours courts seulement
  p_arrivee     date default null,        -- avec p_depart : libres sur toutes ces nuits
  p_depart      date default null,
  p_voyageurs   integer default null
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
  total           bigint                   -- nombre total de résultats (pagination)
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.title, p.type, p.status, p.price, p.city, q.nom, c.nom,
         p.rooms, p.bathrooms, p.area_m2, coalesce(p.furnished, false), p.main_image_url,
         coalesce(p.is_verified, false), p.created_at, p.sejour_court, p.nuits_min,
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
     p.created_at desc,
     p.id
   limit least(greatest(coalesce(p_limite, 20), 1), 50)
  offset greatest(coalesce(p_decalage, 0), 0);
$$;

revoke execute on function public.rechercher_annonces_keyli(
  public.property_status_keyli, public.property_type_keyli, uuid, uuid, numeric, numeric,
  integer, boolean, uuid[], text, integer, integer, boolean, date, date, integer
) from public;
grant execute on function public.rechercher_annonces_keyli(
  public.property_status_keyli, public.property_type_keyli, uuid, uuid, numeric, numeric,
  integer, boolean, uuid[], text, integer, integer, boolean, date, date, integer
) to anon, authenticated;
