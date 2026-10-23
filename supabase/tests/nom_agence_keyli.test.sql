-- Tests du nom d'agence — exécutés par `npm run db:test` (pgTAP), en local,
-- en CI et sur le projet distant (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(11);

-- ------------------------------------------------------------
-- Inscription
-- ------------------------------------------------------------
select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data)
     values ('cccc0000-0000-0000-0000-000000000009', 'sansnom@test.local', '{"role_keyli": "agency"}') $$,
  '22023', null, 'Une agence ne s''inscrit pas sans nom d''agence');

insert into auth.users (id, email, raw_user_meta_data) values
  ('cccc0000-0000-0000-0000-00000000000a', 'a@test.local', '{"role_keyli": "agency", "nom_agence": "  Immo Lagune  "}'),
  ('cccc0000-0000-0000-0000-00000000000b', 'b@test.local', '{"role_keyli": "agency", "nom_agence": "Cocody Habitat"}'),
  ('cccc0000-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner", "nom_agence": "Pas une agence"}'),
  ('cccc0000-0000-0000-0000-0000000000ad', 'ad@test.local', '{}');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'cccc0000-0000-0000-0000-0000000000ad';
-- L'agence B est vérifiée (registre approuvé)
update public.profiles_keyli set verified = true where user_id = 'cccc0000-0000-0000-0000-00000000000b';

select is((select nom_agence from public.profiles_keyli where user_id = 'cccc0000-0000-0000-0000-00000000000a'),
  'Immo Lagune', 'Le nom d''agence est enregistré (espaces retirés)');
select is((select nom_agence from public.profiles_keyli where user_id = 'cccc0000-0000-0000-0000-000000000001'),
  null, 'Un propriétaire n''a pas de nom d''agence');

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- ------------------------------------------------------------
-- Modification par l'agence
-- ------------------------------------------------------------
select pg_temp.connecter('cccc0000-0000-0000-0000-00000000000a');  -- A, non vérifiée
select lives_ok($$ update public.profiles_keyli set nom_agence = 'Immo Lagune SARL' $$,
  'Une agence non vérifiée corrige son nom');
select throws_ok($$ update public.profiles_keyli set nom_agence = '   ' $$,
  '23514', null, 'Le nom d''agence ne peut pas être vidé');

select pg_temp.connecter('cccc0000-0000-0000-0000-00000000000b');  -- B, vérifiée
select throws_ok($$ update public.profiles_keyli set nom_agence = 'Autre nom' $$,
  '42501', null, 'Une agence vérifiée ne change plus son nom');

select pg_temp.connecter('cccc0000-0000-0000-0000-000000000001');  -- P
select throws_ok($$ update public.profiles_keyli set nom_agence = 'Mon agence' $$,
  '23514', null, 'Un propriétaire ne se donne pas de nom d''agence');

-- ------------------------------------------------------------
-- Correction par un admin
-- ------------------------------------------------------------
select pg_temp.connecter('cccc0000-0000-0000-0000-0000000000ad');  -- AD
select throws_ok($$ select public.admin_modifier_nom_agence_keyli('cccc0000-0000-0000-0000-00000000000b', 'Cocody Habitat SA', '') $$,
  '22023', null, 'La correction admin exige un motif');
select lives_ok($$ select public.admin_modifier_nom_agence_keyli('cccc0000-0000-0000-0000-00000000000b', 'Cocody Habitat SA', 'Aligné sur le registre') $$,
  'Un admin corrige le nom d''une agence vérifiée');

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select results_eq(
  $$ select nom_affiche from public.profils_publics_keyli where user_id = 'cccc0000-0000-0000-0000-00000000000b' $$,
  $$ values ('Cocody Habitat SA'::text) $$,
  'Le profil public affiche le nom d''agence');

set local role postgres;
select is(
  (select details ->> 'apres' from public.audit_logs_keyli where action = 'nom_agence_modifie'),
  'Cocody Habitat SA', 'La correction est journalisée');

select * from finish();
rollback;
