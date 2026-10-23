-- Tests de la vue profils_publics_keyli — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant (`--linked`).
-- Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('77777777-0000-0000-0000-000000000001', 'awa@test.local',
   '{"role_keyli": "owner", "first_name": "Awa", "last_name": "Koné", "phone": "+2250700000001"}'),
  ('77777777-0000-0000-0000-000000000002', 'agence@test.local',
   '{"role_keyli": "agency", "nom_agence": "Immo Plus Abidjan", "first_name": "Jean", "last_name": "Kouassi"}'),
  ('77777777-0000-0000-0000-000000000003', 'sans-nom@test.local', '{}'),
  ('77777777-0000-0000-0000-000000000004', 'admin@test.local', '{"first_name": "Admin"}');
update public.profiles_keyli set role_keyli = 'admin', id_number = 'CI-123'
 where user_id = '77777777-0000-0000-0000-000000000004';
update public.profiles_keyli set verified = true, rating_avg = 4.5, id_number = 'CI-999'
 where user_id = '77777777-0000-0000-0000-000000000001';

-- ------------------------------------------------------------
-- Structure : aucune colonne sensible dans la vue
-- ------------------------------------------------------------
select has_view('public', 'profils_publics_keyli', 'La vue profils_publics_keyli existe');
select results_eq(
  $$ select count(*)::int from information_schema.columns
      where table_schema = 'public' and table_name = 'profils_publics_keyli'
        and column_name in ('email', 'phone', 'id_number', 'id_validity_date', 'verification_date', 'last_name') $$,
  $$ values (0) $$,
  'Ni email, ni téléphone, ni pièce d''identité, ni nom complet brut dans la vue'
);

-- ------------------------------------------------------------
-- Visiteur anonyme
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select results_eq(
  $$ select nom_affiche, verified, rating_avg from public.profils_publics_keyli
      where user_id = '77777777-0000-0000-0000-000000000001' $$,
  $$ values ('Awa K.'::text, true, 4.50::numeric) $$,
  'Particulier : prénom + initiale, badge et note visibles par un visiteur'
);
select results_eq(
  $$ select nom_affiche from public.profils_publics_keyli where user_id = '77777777-0000-0000-0000-000000000002' $$,
  $$ values ('Immo Plus Abidjan'::text) $$,
  'Agence : nom complet'
);
select results_eq(
  $$ select nom_affiche from public.profils_publics_keyli where user_id = '77777777-0000-0000-0000-000000000003' $$,
  $$ values ('Membre Keyli'::text) $$,
  'Profil sans nom : libellé neutre'
);
select results_eq(
  $$ select count(*)::int from public.profils_publics_keyli where user_id = '77777777-0000-0000-0000-000000000004' $$,
  $$ values (0) $$,
  'Les comptes admin n''apparaissent pas dans les profils publics'
);
select throws_ok($$ select email from public.profils_publics_keyli $$, '42703', null,
  'La colonne email n''existe pas dans la vue publique');
select throws_ok($$ select * from public.profiles_keyli $$, '42501', null,
  'La table profiles_keyli reste fermée aux visiteurs');
select throws_ok(
  $$ update public.profils_publics_keyli set photo_url = 'https://exemple.test/pirate.jpg' $$,
  '42501', null,
  'La vue publique est en lecture seule'
);

-- ------------------------------------------------------------
-- Utilisateur connecté (autre que le titulaire)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "77777777-0000-0000-0000-000000000003", "role": "authenticated"}', true);
select results_eq(
  $$ select count(*)::int from public.profiles_keyli where user_id = '77777777-0000-0000-0000-000000000001' $$,
  $$ values (0) $$,
  'Un utilisateur ne lit toujours pas le profil complet d''un autre'
);

set local role postgres;
select * from finish();
rollback;
