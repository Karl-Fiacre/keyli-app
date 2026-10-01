-- Tests RLS de profiles_keyli — exécutés par `npm run db:test` (pgTAP), en
-- local et en CI. Tout se déroule dans une transaction annulée à la fin :
-- aucune donnée de test ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Sur le projet distant, `supabase test db --linked` se connecte avec un
-- rôle temporaire (cli_login_postgres) sans droit USAGE sur le schéma
-- extensions où vit pgTAP : on se place en postgres, comme en local, et on
-- ajoute extensions au search_path — le temps de la transaction seulement.
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(17);

-- ------------------------------------------------------------
-- Structure
-- ------------------------------------------------------------
select has_table('public', 'profiles_keyli', 'La table profiles_keyli existe');
select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles_keyli'::regclass),
  true,
  'RLS est activée sur profiles_keyli'
);
select is(
  (select extnamespace::regnamespace::text from pg_extension where extname = 'postgis'),
  'extensions',
  'PostGIS est activé (schéma extensions)'
);

-- ------------------------------------------------------------
-- Inscription : simulée par une insertion directe dans auth.users (le rôle
-- postgres des tests ne peut pas endosser supabase_auth_admin). Le
-- déclenchement du trigger ne dépend pas du rôle appelant : vérifié le
-- 2026-09-28, un trigger s'exécute même si l'appelant n'a pas le droit
-- EXECUTE sur sa fonction (droit retiré volontairement dans la migration).
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'proprietaire@test.local',
   '{"role_keyli": "owner", "first_name": "Awa"}'),
  ('22222222-2222-2222-2222-222222222222', 'chercheur@test.local', '{}');

select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data) values
       ('33333333-3333-3333-3333-333333333333', 'pirate@test.local', '{"role_keyli": "admin"}') $$,
  '22023', null,
  'Inscription avec le rôle admin refusée'
);
select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data) values
       ('44444444-4444-4444-4444-444444444444', 'inconnu@test.local', '{"role_keyli": "superuser"}') $$,
  '22023', null,
  'Inscription avec un rôle inconnu refusée'
);

select is(
  (select role_keyli::text from public.profiles_keyli
    where user_id = '11111111-1111-1111-1111-111111111111'),
  'owner',
  'Le trigger crée le profil avec le rôle choisi à l''inscription'
);
select is(
  (select role_keyli::text from public.profiles_keyli
    where user_id = '22222222-2222-2222-2222-222222222222'),
  'user',
  'Sans rôle dans les métadonnées, le profil est créé en user'
);

-- ------------------------------------------------------------
-- Utilisateur authentifié (propriétaire 1111…)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select results_eq(
  $$ select user_id from public.profiles_keyli $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'Un utilisateur ne voit que son propre profil'
);

select lives_ok(
  $$ update public.profiles_keyli set first_name = 'Awa K.', phone = '+2250700000000'
      where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'Un utilisateur peut modifier son prénom et son téléphone'
);

-- Tentative sur le profil d'un autre : aucune ligne visible, donc aucune modifiée
update public.profiles_keyli set first_name = 'Pirate'
 where user_id = '22222222-2222-2222-2222-222222222222';

select throws_ok(
  $$ update public.profiles_keyli set role_keyli = 'admin'
      where user_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'Un utilisateur ne peut pas modifier son propre rôle'
);
select throws_ok(
  $$ update public.profiles_keyli set verified = true
      where user_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'Un utilisateur ne peut pas se déclarer vérifié'
);
select throws_ok(
  $$ update public.profiles_keyli set rating_avg = 5
      where user_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'Un utilisateur ne peut pas modifier sa note moyenne'
);
select throws_ok(
  $$ insert into public.profiles_keyli (user_id, email)
       values ('11111111-1111-1111-1111-111111111111', 'doublon@test.local') $$,
  '42501', null,
  'Un utilisateur ne peut pas créer de profil lui-même'
);
select throws_ok(
  $$ delete from public.profiles_keyli
      where user_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null,
  'Un utilisateur ne peut pas supprimer de profil'
);

set local role postgres;

select is(
  (select first_name from public.profiles_keyli
    where user_id = '11111111-1111-1111-1111-111111111111'),
  'Awa K.',
  'La modification autorisée a bien été enregistrée'
);
select is(
  (select first_name from public.profiles_keyli
    where user_id = '22222222-2222-2222-2222-222222222222'),
  null,
  'Le profil d''un autre utilisateur n''a pas été modifié'
);

-- ------------------------------------------------------------
-- Visiteur anonyme
-- ------------------------------------------------------------
set local role anon;
select throws_ok(
  $$ select * from public.profiles_keyli $$,
  '42501', null,
  'Un visiteur anonyme ne peut pas lire les profils'
);
set local role postgres;

select * from finish();
rollback;
