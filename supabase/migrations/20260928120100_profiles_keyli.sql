-- Keyli — Module auth : rôles et profils (Phase 0)
--
-- Sources : docs/reference/schema_cible_reference.sql (section PROFILS),
-- docs/MODULES/auth.md, docs/ROLES.md, docs/PRD_REGLES.md (MODULE AUTH).
--
-- Décision de sécurité du 2026-09-28 (docs/DATABASE.md) : la policy
-- « FOR ALL » du schéma de référence aurait permis à un utilisateur de se
-- donner lui-même le rôle admin ou le statut vérifié. À la place :
--   1. le profil est créé par trigger à l'inscription, jamais par le client ;
--   2. le client lit son propre profil et ne peut modifier que prénom, nom,
--      téléphone et photo — rôle, vérification, note moyenne, email et pièce
--      d'identité restent réservés au serveur (Edge Function ou admin).

-- ------------------------------------------------------------
-- Enum des rôles
-- ------------------------------------------------------------
create type public.user_role_keyli as enum ('user', 'owner', 'agency', 'admin');

-- ------------------------------------------------------------
-- Table profiles_keyli (colonnes identiques au schéma de référence)
-- ------------------------------------------------------------
create table public.profiles_keyli (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) unique not null,
  email               text not null,
  first_name          text,
  last_name           text,
  phone               text,
  role_keyli          public.user_role_keyli not null default 'user',
  photo_url           text,
  verified            boolean default false,
  verification_date   timestamptz,
  id_number           text,
  id_validity_date    date,
  rating_avg          numeric(3,2) default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ------------------------------------------------------------
-- updated_at automatique — fonction générique, réutilisée par les
-- prochaines tables _keyli qui ont cette colonne
-- ------------------------------------------------------------
create or replace function public.set_updated_at_keyli()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_keyli_updated_at
  before update on public.profiles_keyli
  for each row execute function public.set_updated_at_keyli();

-- ------------------------------------------------------------
-- Création du profil à l'inscription
-- Le rôle vient des métadonnées du signUp (options.data.role_keyli). Seuls
-- user / owner / agency sont acceptés : admin n'est JAMAIS attribuable par
-- inscription publique (création manuelle uniquement, docs/MODULES/auth.md).
-- Rôle absent → 'user'. Rôle refusé → l'inscription entière échoue, plutôt
-- que de créer silencieusement un compte avec un autre rôle que celui choisi.
-- ------------------------------------------------------------
create or replace function public.handle_new_user_keyli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_demande text := nullif(new.raw_user_meta_data ->> 'role_keyli', '');
begin
  if v_role_demande is not null
     and v_role_demande not in ('user', 'owner', 'agency') then
    raise exception 'Rôle non autorisé à l''inscription : %', v_role_demande
      using errcode = '22023';
  end if;

  insert into public.profiles_keyli (user_id, email, first_name, last_name, phone, role_keyli)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(v_role_demande, 'user')::public.user_role_keyli
  );
  return new;
end;
$$;

create trigger on_auth_user_created_keyli
  after insert on auth.users
  for each row execute function public.handle_new_user_keyli();

-- Fonctions de trigger : jamais appelables directement via l'API (RPC)
revoke execute on function public.set_updated_at_keyli() from public, anon, authenticated;
revoke execute on function public.handle_new_user_keyli() from public, anon, authenticated;

-- ------------------------------------------------------------
-- Row-Level Security + policies (même migration, docs/SETUP.md)
-- ------------------------------------------------------------
alter table public.profiles_keyli enable row level security;

-- Lecture : uniquement son propre profil. Un affichage public (nom du
-- propriétaire, note moyenne sur une annonce) sera décidé avec les modules
-- annonces/notation — il ne devra jamais exposer email, téléphone ni pièce.
create policy "Utilisateur lit son propre profil"
  on public.profiles_keyli for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Modification : uniquement son propre profil, et uniquement les colonnes
-- autorisées par les privilèges ci-dessous.
create policy "Utilisateur modifie son propre profil"
  on public.profiles_keyli for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Aucune policy INSERT ni DELETE : création par trigger uniquement,
-- suppression côté serveur uniquement.

-- ------------------------------------------------------------
-- Privilèges par colonne — le vrai verrou contre l'élévation de rôle
-- Supabase accorde par défaut tous les droits à anon/authenticated sur les
-- nouvelles tables de public : on les retire, puis on ne rend que le strict
-- nécessaire. id_number / id_validity_date pourront être rouverts au module
-- vérification si le parcours l'exige (décision à prendre à ce moment-là).
-- ------------------------------------------------------------
revoke all on public.profiles_keyli from anon, authenticated;
grant select on public.profiles_keyli to authenticated;
grant update (first_name, last_name, phone, photo_url) on public.profiles_keyli to authenticated;
