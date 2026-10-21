-- Tests du retrait de vérification et de la suspension de compte —
-- exécutés par `npm run db:test` (pgTAP), en local, en CI et sur le projet
-- distant (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(28);

-- ------------------------------------------------------------
-- SA super_admin, AD et AD2 admins, P propriétaire vérifié (bien vérifié),
-- C chercheur
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('bbbb0000-0000-0000-0000-00000000005a', 'sa@test.local', '{}'),
  ('bbbb0000-0000-0000-0000-0000000000ad', 'ad@test.local', '{}'),
  ('bbbb0000-0000-0000-0000-0000000000a2', 'ad2@test.local', '{}'),
  ('bbbb0000-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}'),
  ('bbbb0000-0000-0000-0000-00000000000c', 'c@test.local', '{}');
update public.profiles_keyli set role_keyli = 'super_admin' where user_id = 'bbbb0000-0000-0000-0000-00000000005a';
update public.profiles_keyli set role_keyli = 'admin'
 where user_id in ('bbbb0000-0000-0000-0000-0000000000ad', 'bbbb0000-0000-0000-0000-0000000000a2');

insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
  select 'bbbb0000-0000-0000-0000-000000000001', id, prix_mensuel, now() - interval '1 day', now() + interval '1 month'
    from public.plans_keyli where code = 'proprietaire';
insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
  values ('bbbb0000-0000-0000-0000-000000000001', 'Villa P', 'villa', 'a_louer', 300000, 'Abidjan', 'SRID=4326;POINT(-4 5.3)');
select set_config('test.villa', (select id::text from public.properties_keyli where title = 'Villa P'), true);

insert into public.documents_keyli (user_id, property_id, doc_type, file_url, status) values
  ('bbbb0000-0000-0000-0000-000000000001', null, 'extrait_naissance', 'bbbb0000-0000-0000-0000-000000000001/e.pdf', 'approved'),
  ('bbbb0000-0000-0000-0000-000000000001', null, 'cert_residence', 'bbbb0000-0000-0000-0000-000000000001/c.pdf', 'approved'),
  ('bbbb0000-0000-0000-0000-000000000001', current_setting('test.villa')::uuid, 'acd', 'bbbb0000-0000-0000-0000-000000000001/a.pdf', 'approved');
update public.profiles_keyli set verified = true, verification_date = now() where user_id = 'bbbb0000-0000-0000-0000-000000000001';
update public.properties_keyli set is_verified = true where title = 'Villa P';

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- ------------------------------------------------------------
-- Retrait de vérification
-- ------------------------------------------------------------
select pg_temp.connecter('bbbb0000-0000-0000-0000-00000000000c');  -- C
select throws_ok($$ select public.admin_retirer_verification_compte_keyli('bbbb0000-0000-0000-0000-000000000001', 'Fraude') $$,
  '42501', null, 'Un utilisateur ordinaire ne retire pas de vérification');

select pg_temp.connecter('bbbb0000-0000-0000-0000-0000000000ad');  -- AD
select throws_ok($$ select public.admin_retirer_verification_compte_keyli('bbbb0000-0000-0000-0000-000000000001', '  ') $$,
  '22023', null, 'Le motif est obligatoire');
select lives_ok($$ select public.admin_retirer_verification_compte_keyli('bbbb0000-0000-0000-0000-000000000001', 'Pièce falsifiée') $$,
  'L''admin retire la vérification d''un compte');
select is((select verified from public.profiles_keyli where user_id = 'bbbb0000-0000-0000-0000-000000000001'), false,
  'Le compte n''est plus vérifié');
select is(
  (select count(*)::int from public.documents_keyli
    where user_id = 'bbbb0000-0000-0000-0000-000000000001' and status = 'rejected'
      and review_notes = 'Vérification retirée : Pièce falsifiée'),
  2, 'Ses pièces d''identité et de résidence passent « rejetées » avec le motif');
select lives_ok($$ select public.admin_retirer_verification_bien_keyli(current_setting('test.villa')::uuid, 'Titre contesté') $$,
  'L''admin retire le badge d''un bien');
select is((select is_verified from public.properties_keyli where title = 'Villa P'), false,
  'Le bien n''est plus vérifié');
select throws_ok($$ select public.admin_retirer_verification_bien_keyli(current_setting('test.villa')::uuid, 'Encore') $$,
  '23514', null, 'On ne retire pas un badge déjà absent');

select pg_temp.connecter('bbbb0000-0000-0000-0000-000000000001');  -- P
select results_eq(
  $$ select count(*)::int from public.notifications_keyli where type = 'verification_retiree' $$,
  $$ values (2) $$, 'Le propriétaire est notifié des deux retraits');
select lives_ok(
  $$ insert into public.documents_keyli (user_id, doc_type, file_url)
     values ('bbbb0000-0000-0000-0000-000000000001', 'extrait_naissance', 'bbbb0000-0000-0000-0000-000000000001/e2.pdf') $$,
  'Le propriétaire peut déposer une nouvelle pièce');

-- ------------------------------------------------------------
-- Suspension indéfinie de P
-- ------------------------------------------------------------
select pg_temp.connecter('bbbb0000-0000-0000-0000-0000000000ad');  -- AD
select lives_ok($$ select public.admin_suspendre_compte_keyli('bbbb0000-0000-0000-0000-000000000001', 'Fraude documentaire') $$,
  'L''admin suspend un compte');

set local role postgres;
select ok((select banned_until > now() + interval '50 years' from auth.users where id = 'bbbb0000-0000-0000-0000-000000000001'),
  'Suspension indéfinie : connexion bloquée');

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select results_eq($$ select count(*)::int from public.properties_keyli $$, $$ values (0) $$,
  'Les annonces d''un compte suspendu disparaissent du public');

-- Session encore ouverte du compte suspendu
set local role authenticated;
select pg_temp.connecter('bbbb0000-0000-0000-0000-000000000001');  -- P
select results_eq($$ select count(*)::int from public.profiles_keyli $$, $$ values (1) $$,
  'Le compte suspendu lit encore son profil');
update public.properties_keyli set price = 1;  -- filtré par la policy restrictive : aucune ligne touchée
select results_eq($$ select price from public.properties_keyli where title = 'Villa P' $$, $$ values (300000::numeric) $$,
  'Le compte suspendu ne modifie plus ses annonces');
select throws_ok(
  $$ insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
     values ('bbbb0000-0000-0000-0000-000000000001', 'Nouvelle', 'studio', 'a_louer', 1, 'Abidjan', 'SRID=4326;POINT(-4 5.3)') $$,
  '42501', null, 'Le compte suspendu ne publie plus');
select throws_ok(
  $$ insert into public.feedback_keyli (user_id, type, subject, message)
     values ('bbbb0000-0000-0000-0000-000000000001', 'complaint', 'x', 'y') $$,
  '42501', null, 'Le compte suspendu n''écrit plus nulle part');

-- ------------------------------------------------------------
-- Règles de suspension des administrateurs
-- ------------------------------------------------------------
select pg_temp.connecter('bbbb0000-0000-0000-0000-0000000000ad');  -- AD
select throws_ok($$ select public.admin_suspendre_compte_keyli('bbbb0000-0000-0000-0000-0000000000a2', 'Abus') $$,
  '42501', null, 'Un admin ne suspend pas un autre admin');
select throws_ok($$ select public.admin_suspendre_compte_keyli('bbbb0000-0000-0000-0000-0000000000ad', 'Moi') $$,
  '42501', null, 'On ne suspend pas son propre compte');
select throws_ok($$ select public.admin_suspendre_compte_keyli('bbbb0000-0000-0000-0000-00000000000c', 'x', now() - interval '1 day') $$,
  '22023', null, 'Une date de fin passée est refusée');

select pg_temp.connecter('bbbb0000-0000-0000-0000-00000000005a');  -- SA
select lives_ok($$ select public.admin_suspendre_compte_keyli('bbbb0000-0000-0000-0000-0000000000a2', 'Abus de droits') $$,
  'Le super_admin suspend un admin');

-- ------------------------------------------------------------
-- Réactivation de P
-- ------------------------------------------------------------
select pg_temp.connecter('bbbb0000-0000-0000-0000-0000000000ad');  -- AD
select lives_ok($$ select public.admin_reactiver_compte_keyli('bbbb0000-0000-0000-0000-000000000001', 'Pièces régularisées') $$,
  'L''admin réactive le compte');
select throws_ok($$ select public.admin_reactiver_compte_keyli('bbbb0000-0000-0000-0000-000000000001') $$,
  '23514', null, 'On ne réactive pas un compte qui n''est pas suspendu');

set local role postgres;
select is((select banned_until from auth.users where id = 'bbbb0000-0000-0000-0000-000000000001'), null,
  'La connexion est de nouveau possible');

set local role authenticated;
select pg_temp.connecter('bbbb0000-0000-0000-0000-000000000001');  -- P
select lives_ok($$ update public.properties_keyli set price = 290000 $$,
  'Le compte réactivé modifie de nouveau ses annonces');

-- ------------------------------------------------------------
-- Suspension temporaire de C : levée automatique à la date de fin
-- ------------------------------------------------------------
select pg_temp.connecter('bbbb0000-0000-0000-0000-0000000000ad');  -- AD
select public.admin_suspendre_compte_keyli('bbbb0000-0000-0000-0000-00000000000c', 'Spam', now() + interval '7 days');

select pg_temp.connecter('bbbb0000-0000-0000-0000-00000000000c');  -- C
select throws_ok(
  $$ insert into public.favorites_keyli (user_id, property_id)
     values ('bbbb0000-0000-0000-0000-00000000000c', current_setting('test.villa')::uuid) $$,
  '42501', null, 'Pendant la suspension temporaire, le chercheur n''écrit pas');

set local role postgres;
update public.profiles_keyli set suspension_fin = now() - interval '1 minute'
 where user_id = 'bbbb0000-0000-0000-0000-00000000000c';  -- la date de fin est passée
set local role authenticated;
select lives_ok(
  $$ insert into public.favorites_keyli (user_id, property_id)
     values ('bbbb0000-0000-0000-0000-00000000000c', current_setting('test.villa')::uuid) $$,
  'À la date de fin, la suspension se lève d''elle-même');

set local role postgres;
select is(
  (select count(*)::int from public.audit_logs_keyli
    where action in ('verification_retiree', 'verification_bien_retiree', 'compte_suspendu', 'compte_reactive')),
  6, 'Chaque action de modération est journalisée');

select * from finish();
rollback;
