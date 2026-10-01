-- Keyli — Module annonces : properties_keyli et property_media_keyli
--
-- Sources : docs/reference/schema_cible_reference.sql (section ANNONCES),
-- docs/DATABASE.md, docs/DATABASE_LOGIC.md, docs/MODULES/annonces.md,
-- docs/MODULES/geolocalisation.md, docs/MODULES/verification.md,
-- docs/MODULES/analytics-tracking.md (compteurs).
--
-- Décisions du porteur de projet du 2026-10-02 :
--   - une annonce n'est jamais supprimée : elle est archivée (archived_at),
--     ce qui préserve notes, messages, leads et historique de tendance ;
--   - une annonce non encore vérifiée est publique, simplement sans badge
--     « Vérifié » (is_verified reste réservé à l'admin) ;
--   - le point GPS est obligatoire (recherche par rayon, carte).
--
-- NON appliqué ici, faute des tables nécessaires (à brancher avec leurs
-- modules) : limite du forfait à la publication (subscriptions_keyli,
-- check-subscription-overage), registre de commerce obligatoire pour une
-- agence (documents_keyli).

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type public.property_type_keyli as enum (
  'maison', 'duplex', 'villa', 'appartement', 'studio',
  'residence_meublee', 'auberge', 'hotel', 'bureau', 'magasin'
);
create type public.property_status_keyli as enum ('a_louer', 'a_vendre');

-- ------------------------------------------------------------
-- Annonces — colonnes du schéma de référence, sauf :
--   geolocation NOT NULL (décision du 2026-10-02, geolocalisation.md)
--   archived_at (nouvelle colonne, décision du 2026-10-02)
-- ------------------------------------------------------------
create table public.properties_keyli (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references auth.users(id) not null,
  agent_id        uuid references public.agency_agents_keyli(id),
  title           text not null,
  type            public.property_type_keyli not null,
  status          public.property_status_keyli not null,
  price           numeric not null,
  description     text,
  city            text not null,
  quartier_id     uuid references public.quartiers_keyli(id),
  geolocation     extensions.geography(Point, 4326) not null,
  area_m2         numeric,
  rooms           integer,
  bathrooms       integer,
  furnished       boolean default false,
  video_url       text,
  main_image_url  text,                   -- tenu à jour par trigger depuis property_media_keyli
  is_verified     boolean default false,  -- admin uniquement (docs/PRD_REGLES.md)
  views_count     integer default 0,      -- compteurs : trigger du module analytics uniquement
  contacts_count  integer default 0,
  archived_at     timestamptz,            -- NULL = publiée ; renseignée = archivée
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_properties_geolocation on public.properties_keyli using gist (geolocation);
create index idx_properties_owner on public.properties_keyli(owner_id);
create index idx_properties_agent on public.properties_keyli(agent_id);
-- Recherche chercheur (docs/DATABASE_LOGIC.md) : couvre aussi le filtre
-- quartier seul, d'où l'absence d'un index séparé sur quartier_id.
create index idx_properties_recherche on public.properties_keyli(quartier_id, type, price);

create trigger trg_properties_keyli_updated_at
  before update on public.properties_keyli
  for each row execute function public.set_updated_at_keyli();

-- ------------------------------------------------------------
-- Médias (colonnes identiques au schéma de référence)
-- ------------------------------------------------------------
create table public.property_media_keyli (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid references public.properties_keyli(id) on delete cascade,
  media_type   text check (media_type in ('image', 'video')),
  url          text not null,
  order_index  integer default 0,
  created_at   timestamptz default now()
);

create index idx_property_media_property on public.property_media_keyli(property_id, order_index);

-- ------------------------------------------------------------
-- main_image_url = première image (plus petit order_index) de l'annonce —
-- jamais saisi par le client (docs/MODULES/annonces.md, DATABASE_LOGIC.md).
-- Recalculé dans la même transaction que chaque écriture de média.
-- ------------------------------------------------------------
create or replace function public.sync_main_image_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property_id uuid := coalesce(new.property_id, old.property_id);
begin
  update public.properties_keyli p
     set main_image_url = (
       select m.url from public.property_media_keyli m
        where m.property_id = v_property_id and m.media_type = 'image'
        order by m.order_index, m.created_at
        limit 1
     )
   where p.id = v_property_id;
  return null;
end;
$$;

create trigger trg_property_media_keyli_main_image
  after insert or update or delete on public.property_media_keyli
  for each row execute function public.sync_main_image_keyli();

revoke execute on function public.sync_main_image_keyli() from public, anon, authenticated;

-- ------------------------------------------------------------
-- RLS — annonces
-- ------------------------------------------------------------
alter table public.properties_keyli enable row level security;

-- Public (visiteurs compris) : toute annonce publiée, vérifiée ou non —
-- le badge « Vérifié » fait la différence à l'affichage.
create policy "Lecture publique des annonces publiées"
  on public.properties_keyli for select
  to anon, authenticated
  using (archived_at is null);

-- Le propriétaire voit aussi ses annonces archivées.
create policy "Propriétaire lit toutes ses annonces"
  on public.properties_keyli for select
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Publication : propriétaires et agences, pour eux-mêmes ; un agent
-- attribué doit appartenir à l'agence qui publie.
create policy "Propriétaire ou agence publie ses annonces"
  on public.properties_keyli for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id
    and (select public.current_user_role_keyli()) in ('owner', 'agency')
    and (
      agent_id is null
      or exists (
        select 1 from public.agency_agents_keyli a
         where a.id = agent_id and a.agency_user_id = (select auth.uid())
      )
    )
  );

-- Modification et archivage : uniquement ses propriétés, mêmes règles
-- d'agent. Pas de policy DELETE : on archive, on ne supprime jamais.
create policy "Propriétaire ou agence modifie ses annonces"
  on public.properties_keyli for update
  to authenticated
  using (
    (select auth.uid()) = owner_id
    and (select public.current_user_role_keyli()) in ('owner', 'agency')
  )
  with check (
    (select auth.uid()) = owner_id
    and (
      agent_id is null
      or exists (
        select 1 from public.agency_agents_keyli a
         where a.id = agent_id and a.agency_user_id = (select auth.uid())
      )
    )
  );

-- Privilèges par colonne : is_verified (admin), compteurs (analytics),
-- main_image_url (trigger) et owner_id (après création) hors de portée du
-- client.
revoke all on public.properties_keyli from anon, authenticated;
grant select on public.properties_keyli to anon, authenticated;
grant insert (owner_id, agent_id, title, type, status, price, description, city,
              quartier_id, geolocation, area_m2, rooms, bathrooms, furnished, video_url)
  on public.properties_keyli to authenticated;
grant update (agent_id, title, type, status, price, description, city,
              quartier_id, geolocation, area_m2, rooms, bathrooms, furnished, video_url,
              archived_at)
  on public.properties_keyli to authenticated;

-- ------------------------------------------------------------
-- RLS — médias
-- ------------------------------------------------------------
alter table public.property_media_keyli enable row level security;

-- Lecture : les médias d'une annonce visible par l'appelant (la RLS de
-- properties_keyli s'applique dans la sous-requête : médias d'une annonce
-- archivée visibles de son seul propriétaire).
create policy "Lecture des médias des annonces visibles"
  on public.property_media_keyli for select
  to anon, authenticated
  using (exists (select 1 from public.properties_keyli p where p.id = property_id));

create policy "Propriétaire gère les médias de ses annonces"
  on public.property_media_keyli for all
  to authenticated
  using (exists (
    select 1 from public.properties_keyli p
     where p.id = property_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.properties_keyli p
     where p.id = property_id and p.owner_id = (select auth.uid())
  ));

-- Un média se supprime (retirer une photo est normal) ; son annonce, jamais.
revoke all on public.property_media_keyli from anon, authenticated;
grant select on public.property_media_keyli to anon, authenticated;
grant insert (property_id, media_type, url, order_index) on public.property_media_keyli to authenticated;
grant update (order_index) on public.property_media_keyli to authenticated;
grant delete on public.property_media_keyli to authenticated;
