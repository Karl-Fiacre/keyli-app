-- Tests RLS de communes_keyli / quartiers_keyli — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(15);

-- ------------------------------------------------------------
-- Structure et données de départ
-- ------------------------------------------------------------
select has_table('public', 'communes_keyli', 'La table communes_keyli existe');
select has_table('public', 'quartiers_keyli', 'La table quartiers_keyli existe');
select is(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.communes_keyli'::regclass, 'public.quartiers_keyli'::regclass)),
  true,
  'RLS est activée sur les deux tables'
);
select has_index('public', 'quartiers_keyli', 'idx_quartiers_commune',
  'Index du sélecteur de quartier présent');
select results_eq(
  $$ select count(*)::int from public.communes_keyli $$,
  $$ values (13) $$,
  'Les 13 communes du Grand Abidjan sont présentes'
);
select set_eq(
  $$ select q.nom from public.quartiers_keyli q
       join public.communes_keyli c on c.id = q.commune_id
      where c.nom = 'Cocody' $$,
  array['Riviera', 'Angré', 'II Plateaux', 'Danga', 'Cocody Centre'],
  'Cocody a ses 5 quartiers de départ'
);
select results_eq(
  $$ select count(*)::int from public.communes_keyli c
      where not exists (select 1 from public.quartiers_keyli q where q.commune_id = c.id) $$,
  $$ values (0) $$,
  'Chaque commune a au moins un quartier'
);
select throws_ok(
  $$ insert into public.quartiers_keyli (commune_id, nom)
       select id, 'Riviera' from public.communes_keyli where nom = 'Cocody' $$,
  '23505', null,
  'Un même quartier ne peut pas exister deux fois dans une commune'
);

-- ------------------------------------------------------------
-- Visiteur anonyme (recherche, Accueil)
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select results_eq(
  $$ select count(*)::int from public.quartiers_keyli $$,
  $$ values (17) $$,
  'Un visiteur lit tous les quartiers'
);
select throws_ok(
  $$ insert into public.communes_keyli (nom) values ('Commune pirate') $$,
  '42501', null,
  'Un visiteur ne peut pas créer de commune'
);

-- ------------------------------------------------------------
-- Utilisateur authentifié (formulaire de publication)
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select results_eq(
  $$ select count(*)::int from public.communes_keyli $$,
  $$ values (13) $$,
  'Un utilisateur connecté lit toutes les communes'
);
select throws_ok(
  $$ insert into public.quartiers_keyli (commune_id, nom)
       select id, 'Quartier inventé' from public.communes_keyli where nom = 'Cocody' $$,
  '42501', null,
  'Un utilisateur ne peut pas créer de quartier à la volée'
);
select throws_ok(
  $$ update public.quartiers_keyli set nom = 'Renommé' where nom = 'Riviera' $$,
  '42501', null,
  'Un utilisateur ne peut pas renommer un quartier'
);
select throws_ok(
  $$ delete from public.communes_keyli where nom = 'Plateau' $$,
  '42501', null,
  'Un utilisateur ne peut pas supprimer de commune'
);

set local role postgres;

select results_eq(
  $$ select count(*)::int from public.quartiers_keyli $$,
  $$ values (17) $$,
  'Le référentiel est inchangé après les tentatives'
);

select * from finish();
rollback;
