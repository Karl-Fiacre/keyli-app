-- Keyli — Agents internes d'une agence
--
-- Sources : docs/reference/schema_cible_reference.sql (section AGENTS
-- INTERNES), docs/DATABASE.md (décision actée « agents internes »),
-- docs/MODULES/dashboard.md, docs/SEED_DATA.md.
--
-- Un seul compte de connexion par agence (role_keyli = 'agency') : les
-- agents ne se connectent jamais. C'est une table de référence gérée par
-- le compte agence, utilisée pour attribuer annonces et leads à un agent
-- (properties_keyli.agent_id, leads_keyli.agent_id) et pour le tableau
-- « Performance de l'équipe » du dashboard Agence.

-- ------------------------------------------------------------
-- Table (colonnes identiques au schéma de référence)
-- ------------------------------------------------------------
create table public.agency_agents_keyli (
  id              uuid primary key default gen_random_uuid(),
  agency_user_id  uuid references auth.users(id) not null,
  nom             text not null,
  actif           boolean default true,
  created_at      timestamptz default now(),
  unique (agency_user_id, nom)
);

-- ------------------------------------------------------------
-- Rôle de l'utilisateur connecté — lu dans profiles_keyli, que le client
-- ne peut pas modifier (privilèges par colonne) : source fiable pour les
-- policies. SECURITY DEFINER pour ne pas dépendre de la RLS de
-- profiles_keyli ; réutilisable par les prochaines policies par rôle.
-- ------------------------------------------------------------
create or replace function public.current_user_role_keyli()
returns public.user_role_keyli
language sql
stable
security definer
set search_path = ''
as $$
  select role_keyli from public.profiles_keyli where user_id = (select auth.uid());
$$;

revoke execute on function public.current_user_role_keyli() from public, anon;
grant execute on function public.current_user_role_keyli() to authenticated;

-- ------------------------------------------------------------
-- Row-Level Security + policies (même migration, docs/SETUP.md)
-- ------------------------------------------------------------
alter table public.agency_agents_keyli enable row level security;

-- Lecture : une agence ne voit que ses propres agents.
create policy "Agence lit ses agents"
  on public.agency_agents_keyli for select
  to authenticated
  using ((select auth.uid()) = agency_user_id);

-- Création : réservée aux comptes agence, et uniquement pour eux-mêmes.
create policy "Agence crée ses agents"
  on public.agency_agents_keyli for insert
  to authenticated
  with check (
    (select auth.uid()) = agency_user_id
    and (select public.current_user_role_keyli()) = 'agency'
  );

-- Modification : renommer ou désactiver ses propres agents.
create policy "Agence modifie ses agents"
  on public.agency_agents_keyli for update
  to authenticated
  using (
    (select auth.uid()) = agency_user_id
    and (select public.current_user_role_keyli()) = 'agency'
  )
  with check ((select auth.uid()) = agency_user_id);

-- Pas de suppression : un agent qui quitte l'agence est désactivé
-- (actif = false), pour conserver l'historique de ses annonces et de ses
-- leads dans le tableau de performance.

-- ------------------------------------------------------------
-- Privilèges par colonne : agency_user_id ne peut jamais être changé après
-- création (une agence ne peut pas « donner » un agent à une autre).
-- ------------------------------------------------------------
revoke all on public.agency_agents_keyli from anon, authenticated;
grant select on public.agency_agents_keyli to authenticated;
grant insert (agency_user_id, nom, actif) on public.agency_agents_keyli to authenticated;
grant update (nom, actif) on public.agency_agents_keyli to authenticated;
