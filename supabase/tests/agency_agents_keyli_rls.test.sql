-- Tests RLS de agency_agents_keyli — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant (`--linked`).
-- Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(16);

-- ------------------------------------------------------------
-- Comptes de test (profils créés par le trigger d'inscription)
--   A : agence 1 — B : agence 2 — P : propriétaire
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'agence1@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Test"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'agence2@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Test"}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'proprio@test.local', '{"role_keyli": "owner"}');

insert into public.agency_agents_keyli (agency_user_id, nom) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Agent de l''agence 2');

select has_table('public', 'agency_agents_keyli', 'La table agency_agents_keyli existe');
select is(
  (select relrowsecurity from pg_class where oid = 'public.agency_agents_keyli'::regclass),
  true,
  'RLS est activée sur agency_agents_keyli'
);

-- ------------------------------------------------------------
-- Agence 1 connectée
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.agency_agents_keyli (agency_user_id, nom) values
       ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mariam Koné'),
       ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Didier Yao') $$,
  'Une agence crée ses agents'
);
select results_eq(
  $$ select nom from public.agency_agents_keyli order by nom $$,
  $$ values ('Didier Yao'::text), ('Mariam Koné'::text) $$,
  'Une agence ne voit que ses propres agents'
);
select throws_ok(
  $$ insert into public.agency_agents_keyli (agency_user_id, nom)
       values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mariam Koné') $$,
  '23505', null,
  'Deux agents de la même agence ne peuvent pas porter le même nom'
);
select throws_ok(
  $$ insert into public.agency_agents_keyli (agency_user_id, nom)
       values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Agent infiltré') $$,
  '42501', null,
  'Une agence ne peut pas créer d''agent pour une autre agence'
);
select lives_ok(
  $$ update public.agency_agents_keyli set actif = false where nom = 'Didier Yao' $$,
  'Une agence désactive un de ses agents'
);
select throws_ok(
  $$ update public.agency_agents_keyli
        set agency_user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      where nom = 'Mariam Koné' $$,
  '42501', null,
  'Une agence ne peut pas transférer un agent à une autre agence'
);
select throws_ok(
  $$ delete from public.agency_agents_keyli where nom = 'Mariam Koné' $$,
  '42501', null,
  'Un agent ne se supprime pas (désactivation uniquement)'
);

-- Tentative sur l'agent de l'agence 2 : invisible, donc rien n'est modifié
update public.agency_agents_keyli set nom = 'Renommé' where agency_user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- ------------------------------------------------------------
-- Propriétaire connecté (pas une agence)
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.agency_agents_keyli (agency_user_id, nom)
       values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mon agent') $$,
  '42501', null,
  'Un propriétaire ne peut pas créer d''agents'
);
select results_eq(
  $$ select count(*)::int from public.agency_agents_keyli $$,
  $$ values (0) $$,
  'Un propriétaire ne voit aucun agent'
);

-- ------------------------------------------------------------
-- Visiteur anonyme
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok(
  $$ select * from public.agency_agents_keyli $$,
  '42501', null,
  'Un visiteur anonyme ne peut pas lire les agents'
);
select throws_ok(
  $$ select public.current_user_role_keyli() $$,
  '42501', null,
  'Un visiteur anonyme ne peut pas appeler current_user_role_keyli()'
);

-- ------------------------------------------------------------
-- Vérifications finales
-- ------------------------------------------------------------
set local role postgres;

select is(
  (select nom from public.agency_agents_keyli
    where agency_user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'Agent de l''agence 2',
  'L''agent de l''agence 2 n''a pas été modifié par l''agence 1'
);
select is(
  (select actif from public.agency_agents_keyli where nom = 'Didier Yao'),
  false,
  'La désactivation a bien été enregistrée'
);
select is(
  (select agency_user_id::text from public.agency_agents_keyli where nom = 'Mariam Koné'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'L''agent est resté rattaché à son agence'
);

select * from finish();
rollback;
