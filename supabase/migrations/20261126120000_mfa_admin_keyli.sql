-- Double authentification obligatoire pour les pouvoirs d'administration
-- (docs/MODULES/admin.md, section « Double authentification »).
--
-- Un compte admin ou super_admin n'exerce ses pouvoirs que si sa session a
-- été vérifiée par un second facteur (application d'authentification,
-- TOTP) : niveau d'assurance « aal2 » dans le jeton. Avec un simple mot de
-- passe (aal1), ces deux fonctions répondent « non » — et comme toutes les
-- lectures, policies et actions d'administration passent par elles, un mot
-- de passe volé ne suffit plus à agir en admin.
--
-- Aucune table ni policy ne change : seules les deux fonctions de rôle sont
-- redéfinies. L'enrôlement du second facteur passe par l'API d'auth de
-- Supabase, sans pouvoir admin, donc personne ne peut se retrouver bloqué
-- hors de l'enrôlement. Secours (facteur perdu) : supprimer le facteur en
-- SQL direct par le porteur, voir docs/MODULES/admin.md.

create or replace function public.est_admin_keyli()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select role_keyli in ('admin', 'super_admin')
      from public.profiles_keyli where user_id = (select auth.uid())
  ), false)
  and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

create or replace function public.est_super_admin_keyli()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select role_keyli = 'super_admin'
      from public.profiles_keyli where user_id = (select auth.uid())
  ), false)
  and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

-- Droits inchangés (create or replace les conserve) ; rappelés par clarté
revoke execute on function public.est_admin_keyli() from public, anon;
revoke execute on function public.est_super_admin_keyli() from public, anon;
grant execute on function public.est_admin_keyli() to authenticated;
grant execute on function public.est_super_admin_keyli() to authenticated;
