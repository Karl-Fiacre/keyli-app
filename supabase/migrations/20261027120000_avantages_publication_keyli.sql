-- Keyli — Avantages / proximités des annonces et publication atomique
--
-- Sources : docs/prd.md (création d'annonce « photos, description,
-- avantages/proximités, localisation carte » ; filtres avancés
-- « avantages/proximités », Must), docs/MODULES/annonces.md (flux de
-- publication), docs/DATABASE_LOGIC.md (écritures atomiques).
--
-- Décisions du porteur de projet du 2026-10-27 :
--   - avantages et proximités en LISTE FERMÉE : table de référence
--     (ajustable en données, comme plans_keyli) + liaison annonce ↔ avantage,
--     filtrable et indexée ;
--   - photos dans un second temps (Cloudinary, clés à poser) ;
--   - point GPS choisi sur une carte Mapbox ou par « ma position ».
--
-- La publication passe par publier_annonce_keyli : annonce et avantages
-- dans la même transaction, avec les droits de l'utilisateur (RLS et trigger
-- de forfait s'appliquent à lui, codes KY001 à KY004 inchangés).

-- ============================================================
-- Référentiel des avantages
-- ============================================================
create table public.avantages_keyli (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  libelle     text not null,
  categorie   text not null check (categorie in ('equipement', 'proximite')),
  ordre       integer not null default 0,
  actif       boolean not null default true,
  created_at  timestamptz default now()
);

alter table public.avantages_keyli enable row level security;

-- Lecture publique des avantages proposés (formulaire, filtres)
create policy "Lecture publique des avantages actifs"
  on public.avantages_keyli for select
  to anon, authenticated
  using (actif);

revoke all on public.avantages_keyli from anon, authenticated;
grant select on public.avantages_keyli to anon, authenticated;

insert into public.avantages_keyli (code, libelle, categorie, ordre) values
  ('climatisation',      'Climatisation',             'equipement', 10),
  ('parking',            'Parking',                   'equipement', 20),
  ('gardien',            'Gardien / sécurité',        'equipement', 30),
  ('groupe_electrogene', 'Groupe électrogène',        'equipement', 40),
  ('forage',             'Forage / réserve d''eau',   'equipement', 50),
  ('cuisine_equipee',    'Cuisine équipée',           'equipement', 60),
  ('balcon_terrasse',    'Balcon / terrasse',         'equipement', 70),
  ('jardin_cour',        'Jardin / cour',             'equipement', 80),
  ('piscine',            'Piscine',                   'equipement', 90),
  ('ascenseur',          'Ascenseur',                 'equipement', 100),
  ('internet',           'Internet / fibre',          'equipement', 110),
  ('ecole',              'École',                     'proximite',  10),
  ('marche',             'Marché',                    'proximite',  20),
  ('supermarche',        'Supermarché',               'proximite',  30),
  ('pharmacie',          'Pharmacie',                 'proximite',  40),
  ('hopital',            'Hôpital / clinique',        'proximite',  50),
  ('transport',          'Transport (gbaka, bus, woro-woro)', 'proximite', 60),
  ('banque',             'Banque / distributeur',     'proximite',  70),
  ('lieu_de_culte',      'Lieu de culte',             'proximite',  80);

-- ============================================================
-- Avantages d'une annonce
-- ============================================================
create table public.property_avantages_keyli (
  property_id  uuid not null references public.properties_keyli(id) on delete cascade,
  avantage_id  uuid not null references public.avantages_keyli(id),
  created_at   timestamptz default now(),
  primary key (property_id, avantage_id)
);

-- Filtre de recherche « avec tel avantage » (la clé primaire couvre
-- l'accès par annonce)
create index idx_property_avantages_avantage on public.property_avantages_keyli (avantage_id, property_id);

alter table public.property_avantages_keyli enable row level security;

-- Lecture : avantages des annonces visibles par l'appelant (la RLS de
-- properties_keyli s'applique dans la sous-requête)
create policy "Lecture des avantages des annonces visibles"
  on public.property_avantages_keyli for select
  to anon, authenticated
  using (exists (select 1 from public.properties_keyli p where p.id = property_id));

-- Le propriétaire de l'annonce (compte actif) ajoute ou retire ses avantages
create policy "Propriétaire ajoute les avantages de ses annonces"
  on public.property_avantages_keyli for insert
  to authenticated
  with check (
    public.compte_actif_keyli((select auth.uid()))
    and exists (select 1 from public.properties_keyli p
                 where p.id = property_id and p.owner_id = (select auth.uid()))
  );
create policy "Propriétaire retire les avantages de ses annonces"
  on public.property_avantages_keyli for delete
  to authenticated
  using (
    public.compte_actif_keyli((select auth.uid()))
    and exists (select 1 from public.properties_keyli p
                 where p.id = property_id and p.owner_id = (select auth.uid()))
  );

revoke all on public.property_avantages_keyli from anon, authenticated;
grant select on public.property_avantages_keyli to anon, authenticated;
grant insert, delete on public.property_avantages_keyli to authenticated;

-- ============================================================
-- Publication atomique d'une annonce — SECURITY INVOKER : l'insertion se
-- fait avec les droits de l'utilisateur (RLS « publie ses annonces »,
-- trigger de forfait, compte suspendu). Renvoie l'id de l'annonce.
-- ============================================================
create or replace function public.publier_annonce_keyli(
  p_titre               text,
  p_type                public.property_type_keyli,
  p_statut              public.property_status_keyli,
  p_prix                numeric,
  p_ville               text,
  p_latitude            double precision,
  p_longitude           double precision,
  p_quartier            uuid default null,
  p_description         text default null,
  p_surface             numeric default null,
  p_pieces              integer default null,
  p_salles_de_bain      integer default null,
  p_meuble              boolean default false,
  p_avantages           uuid[] default '{}',
  p_accepte_depassement boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if coalesce(btrim(p_titre), '') = '' or length(p_titre) > 120 then
    raise exception 'Le titre est obligatoire (120 caractères au plus)' using errcode = '23514';
  end if;
  if p_prix is null or p_prix <= 0 then
    raise exception 'Le prix doit être supérieur à zéro' using errcode = '23514';
  end if;
  if p_latitude is null or p_longitude is null
     or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Point GPS invalide' using errcode = '23514';
  end if;
  if (p_surface is not null and p_surface <= 0)
     or (p_pieces is not null and p_pieces < 0)
     or (p_salles_de_bain is not null and p_salles_de_bain < 0) then
    raise exception 'Surface, pièces et salles de bain ne peuvent pas être négatives' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(coalesce(p_avantages, '{}')) a(id)
              where not exists (select 1 from public.avantages_keyli v where v.id = a.id and v.actif)) then
    raise exception 'Avantage inconnu' using errcode = '23514';
  end if;

  insert into public.properties_keyli
    (owner_id, title, type, status, price, description, city, quartier_id, geolocation,
     area_m2, rooms, bathrooms, furnished, accepte_depassement)
  values
    ((select auth.uid()), btrim(p_titre), p_type, p_statut, p_prix, nullif(btrim(p_description), ''),
     btrim(p_ville), p_quartier,
     extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography,
     p_surface, p_pieces, p_salles_de_bain, coalesce(p_meuble, false), coalesce(p_accepte_depassement, false))
  returning id into v_id;

  insert into public.property_avantages_keyli (property_id, avantage_id)
  select v_id, a.id from (select distinct unnest(coalesce(p_avantages, '{}')) as id) a;

  return v_id;
end;
$$;

revoke execute on function public.publier_annonce_keyli(
  text, public.property_type_keyli, public.property_status_keyli, numeric, text,
  double precision, double precision, uuid, text, numeric, integer, integer, boolean, uuid[], boolean
) from public, anon;
grant execute on function public.publier_annonce_keyli(
  text, public.property_type_keyli, public.property_status_keyli, numeric, text,
  double precision, double precision, uuid, text, numeric, integer, integer, boolean, uuid[], boolean
) to authenticated;
