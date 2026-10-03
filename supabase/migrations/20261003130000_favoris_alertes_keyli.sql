-- Keyli — Favoris et alertes de recherche sauvegardée
--
-- Sources : docs/reference/schema_cible_reference.sql (section FAVORIS &
-- ALERTES DE RECHERCHE), docs/MODULES/annonces.md, docs/PRD_REGLES.md
-- (MODULE CHERCHEUR).
--
-- Le mécanisme de notification d'une alerte (cron ou trigger à la
-- publication) reste à trancher (docs/MODULES/annonces.md) : seules les
-- tables sont créées ici ; derniere_notification_at est réservée au serveur.

-- ============================================================
-- Favoris — bascule : un clic ajoute, un second clic retire
-- ============================================================
create table public.favorites_keyli (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) not null,
  property_id  uuid references public.properties_keyli(id) not null,
  created_at   timestamptz default now(),
  unique (user_id, property_id)   -- couvre aussi la liste « mes favoris » (DATABASE_LOGIC.md)
);

alter table public.favorites_keyli enable row level security;

create policy "Utilisateur lit ses favoris" on public.favorites_keyli
  for select to authenticated using ((select auth.uid()) = user_id);

-- Ajout : une annonce visible par l'utilisateur (publiée, ou la sienne)
create policy "Utilisateur ajoute un favori" on public.favorites_keyli
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.properties_keyli p where p.id = property_id)
  );

-- Retrait : c'est le second clic de la bascule (pas d'historique à garder
-- ici, l'événement est tracé dans property_interactions_keyli)
create policy "Utilisateur retire un favori" on public.favorites_keyli
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.favorites_keyli from anon, authenticated;
grant select, delete on public.favorites_keyli to authenticated;
grant insert (user_id, property_id) on public.favorites_keyli to authenticated;

-- ============================================================
-- Alertes de recherche sauvegardée
-- ============================================================
create table public.search_alerts_keyli (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references auth.users(id) not null,
  criteres                  jsonb not null,  -- {quartier_id, type, prix_max, rooms...} — souple, voir DATABASE_LOGIC.md
  actif                     boolean default true,
  derniere_notification_at  timestamptz,
  created_at                timestamptz default now(),

  -- Des critères sont un objet non vide (pas une alerte « tout le marché »)
  constraint search_alerts_keyli_criteres_objet check (
    jsonb_typeof(criteres) = 'object' and criteres <> '{}'::jsonb
  )
);

-- Alertes actives d'un utilisateur, et parcours des alertes actives par le
-- futur mécanisme de notification
create index idx_search_alerts_user_actif on public.search_alerts_keyli (user_id, actif);

alter table public.search_alerts_keyli enable row level security;

create policy "Utilisateur lit ses alertes" on public.search_alerts_keyli
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Utilisateur crée une alerte" on public.search_alerts_keyli
  for insert to authenticated with check ((select auth.uid()) = user_id);
-- Modifier ses critères, désactiver / réactiver — jamais supprimer
-- (docs/MODULES/annonces.md : historique conservé, réactivable)
create policy "Utilisateur gère ses alertes" on public.search_alerts_keyli
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.search_alerts_keyli from anon, authenticated;
grant select on public.search_alerts_keyli to authenticated;
grant insert (user_id, criteres, actif) on public.search_alerts_keyli to authenticated;
grant update (criteres, actif) on public.search_alerts_keyli to authenticated;
