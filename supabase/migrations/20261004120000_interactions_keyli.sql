-- Keyli — Tracking des interactions (vues, clics) et compteurs d'annonces
--
-- Sources : docs/reference/schema_cible_reference.sql (section TRACKING
-- VUES/CLICS), docs/MODULES/analytics-tracking.md,
-- docs/MODULES/quartiers-tendance.md, docs/DATABASE_LOGIC.md.
--
-- Source de données des KPI « Vues 30j » et des quartiers tendance. Le
-- calcul de tendance lui-même reste non tranché (quartiers-tendance.md) ;
-- le webhook process-interaction-webhook (agrégations asynchrones) se
-- configure plus tard dans le Dashboard.

create type public.interaction_type_keyli as enum (
  'view', 'click_contact', 'click_phone', 'click_whatsapp',
  'click_favorite', 'click_gallery', 'click_map', 'search_neighborhood'
);

-- ------------------------------------------------------------
-- Événements (colonnes et index du schéma de référence, plus contrôles)
-- ------------------------------------------------------------
create table public.property_interactions_keyli (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid references public.properties_keyli(id) on delete cascade,
  user_id           uuid references auth.users(id),          -- NULL = visiteur anonyme ; imposé par trigger
  session_id        text not null,                            -- UUID client, persistant en localStorage
  interaction_type  public.interaction_type_keyli not null,
  source            text,
  quartier_id       uuid references public.quartiers_keyli(id),  -- copié au moment de l'événement
  created_at        timestamptz default now(),

  constraint interactions_keyli_session_valide check (length(session_id) between 8 and 100),
  constraint interactions_keyli_source_valide check (
    source is null or source in ('search', 'map', 'recommandation', 'lien_direct', 'quartier_tendance')
  ),
  -- Un événement porte sur une annonce, sauf la recherche par quartier qui
  -- porte sur un quartier
  constraint interactions_keyli_cible check (
    property_id is not null
    or (interaction_type = 'search_neighborhood' and quartier_id is not null)
  )
);
create index idx_interactions_property on public.property_interactions_keyli(property_id, created_at desc);
create index idx_interactions_type_date on public.property_interactions_keyli(interaction_type, created_at desc);
create index idx_interactions_quartier on public.property_interactions_keyli(quartier_id, interaction_type, created_at desc);
-- Anti-inflation des vues (même session, même bien, 30 minutes)
create index idx_interactions_session_vue on public.property_interactions_keyli(property_id, session_id, created_at desc)
  where interaction_type = 'view';

-- ------------------------------------------------------------
-- Avant écriture : auteur imposé, quartier copié depuis l'annonce
-- (jamais une jointure a posteriori : l'historique de tendance ne doit pas
-- changer si l'annonce change de quartier plus tard)
-- ------------------------------------------------------------
create or replace function public.preparer_interaction_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := (select auth.uid());
  new.created_at := now();
  if new.property_id is not null then
    select p.quartier_id into new.quartier_id from public.properties_keyli p where p.id = new.property_id;
  end if;
  return new;
end;
$$;

create trigger trg_interactions_keyli_preparer
  before insert on public.property_interactions_keyli
  for each row execute function public.preparer_interaction_keyli();

-- ------------------------------------------------------------
-- Après écriture : compteurs dénormalisés (synchrone et minimal,
-- analytics-tracking.md) — une vue ne recompte pas avant 30 minutes pour
-- une même session et un même bien
-- ------------------------------------------------------------
create or replace function public.compter_interaction_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.interaction_type = 'view' then
    if not exists (
      select 1 from public.property_interactions_keyli i
       where i.property_id = new.property_id and i.session_id = new.session_id
         and i.interaction_type = 'view' and i.id <> new.id
         and i.created_at > now() - interval '30 minutes'
    ) then
      update public.properties_keyli set views_count = views_count + 1 where id = new.property_id;
    end if;
  elsif new.interaction_type in ('click_contact', 'click_phone', 'click_whatsapp') then
    update public.properties_keyli set contacts_count = contacts_count + 1 where id = new.property_id;
  end if;
  return null;
end;
$$;

create trigger trg_interactions_keyli_compteurs
  after insert on public.property_interactions_keyli
  for each row execute function public.compter_interaction_keyli();

revoke execute on function public.preparer_interaction_keyli() from public, anon, authenticated;
revoke execute on function public.compter_interaction_keyli() from public, anon, authenticated;

-- ------------------------------------------------------------
-- updated_at d'une annonce : seulement pour une vraie modification, pas à
-- chaque vue ou contact compté (sinon « dernière activité » n'a plus de sens)
-- ------------------------------------------------------------
drop trigger trg_properties_keyli_updated_at on public.properties_keyli;
create trigger trg_properties_keyli_updated_at
  before update of owner_id, agent_id, title, type, status, price, description, city,
                   quartier_id, geolocation, area_m2, rooms, bathrooms, furnished,
                   video_url, main_image_url, is_verified, archived_at
  on public.properties_keyli
  for each row execute function public.set_updated_at_keyli();

-- ------------------------------------------------------------
-- RLS : écriture ouverte (visiteurs compris) sur une annonce visible ;
-- lecture par le propriétaire du bien et l'admin (pas de lecture publique
-- des événements bruts)
-- ------------------------------------------------------------
alter table public.property_interactions_keyli enable row level security;

create policy "Tracking ouvert sur les annonces visibles"
  on public.property_interactions_keyli for insert
  to anon, authenticated
  with check (
    property_id is null
    or exists (select 1 from public.properties_keyli p where p.id = property_id)
  );

create policy "Propriétaire lit les interactions de ses biens"
  on public.property_interactions_keyli for select
  to authenticated
  using (exists (
    select 1 from public.properties_keyli p
     where p.id = property_id and p.owner_id = (select auth.uid())
  ));

create policy "Admin lit toutes les interactions"
  on public.property_interactions_keyli for select
  to authenticated
  using ((select public.est_admin_keyli()));

revoke all on public.property_interactions_keyli from anon, authenticated;
grant insert (property_id, session_id, interaction_type, source, quartier_id)
  on public.property_interactions_keyli to anon, authenticated;
grant select on public.property_interactions_keyli to authenticated;
