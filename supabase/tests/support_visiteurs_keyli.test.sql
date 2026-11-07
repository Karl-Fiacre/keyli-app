-- Tests de l'aide et du support (migration 20261114120000_support_visiteurs_keyli)
-- — exécutés par `npm run db:test` (pgTAP), en local, en CI et sur le projet
-- distant. Transaction annulée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(14);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- C chercheur, X admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('d7000000-0000-0000-0000-000000000001', 'c-sup@test.local', '{"role_keyli": "user"}'),
  ('d7000000-0000-0000-0000-000000000002', 'x-sup@test.local', '{"role_keyli": "user"}');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'd7000000-0000-0000-0000-000000000002';

-- ------------------------------------------------------------
-- Envoi par un visiteur
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select lives_ok(
  $$ select public.envoyer_demande_support_keyli(' Visiteur@Test.Local ', ' Aya ', 'compte',
       'Je ne reçois pas l''email de confirmation.') $$,
  'Un visiteur envoie une demande');

select throws_ok(
  $$ insert into public.demandes_support_keyli (email, nom, sujet, message)
       values ('v@test.local', 'V', 'autre', 'Insertion directe interdite') $$,
  '42501', null, 'Aucune insertion directe pour un visiteur');

select throws_ok(
  $$ select * from public.demandes_support_keyli $$,
  '42501', null, 'Un visiteur ne lit pas les demandes');

select throws_ok(
  $$ select public.envoyer_demande_support_keyli('pas-un-email', 'Aya', 'compte', 'Message assez long') $$,
  '22023', 'Adresse email invalide.', 'Email invalide refusé');

select throws_ok(
  $$ select public.envoyer_demande_support_keyli('v@test.local', 'Aya', 'inconnu', 'Message assez long') $$,
  '22023', 'Sujet inconnu.', 'Sujet inconnu refusé');

select throws_ok(
  $$ select public.envoyer_demande_support_keyli('v@test.local', 'Aya', 'autre', 'Court') $$,
  '22023', null, 'Message trop court refusé');

select throws_ok(
  $$ select public.envoyer_demande_support_keyli('v@test.local', '  ', 'autre', 'Message assez long') $$,
  '22023', null, 'Nom vide refusé');

-- Limite : 3 demandes par heure pour une même adresse
select public.envoyer_demande_support_keyli('visiteur@test.local', 'Aya', 'autre', 'Deuxième demande du jour');
select public.envoyer_demande_support_keyli('visiteur@test.local', 'Aya', 'autre', 'Troisième demande du jour');
select throws_ok(
  $$ select public.envoyer_demande_support_keyli('visiteur@test.local', 'Aya', 'autre', 'Quatrième demande') $$,
  '23514', null, 'Quatrième demande en une heure refusée');

reset role;
set local role postgres;
select is(
  (select format('%s|%s|%s|%s', email, nom, statut, coalesce(user_id::text, 'visiteur'))
     from public.demandes_support_keyli order by created_at limit 1),
  'visiteur@test.local|Aya|nouvelle|visiteur',
  'Email normalisé, nom nettoyé, statut « nouvelle », sans compte');

-- ------------------------------------------------------------
-- Envoi par un utilisateur connecté, lecture et suivi
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('d7000000-0000-0000-0000-000000000001');
select public.envoyer_demande_support_keyli('c-sup@test.local', 'Koffi', 'annonce', 'Mon annonce n''apparaît pas.');
select is((select count(*)::int from public.demandes_support_keyli), 0,
  'Un utilisateur non admin ne lit aucune demande, même la sienne');
update public.demandes_support_keyli set statut = 'traitee';
reset role;
set local role postgres;
select is(
  (select format('%s|%s', user_id, statut) from public.demandes_support_keyli where email = 'c-sup@test.local'),
  'd7000000-0000-0000-0000-000000000001|nouvelle',
  'Le compte de l''expéditeur est rattaché ; un non-admin ne change pas le statut');

set local role authenticated;
select pg_temp.connecter('d7000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.demandes_support_keyli), 4, 'L''admin lit toutes les demandes');
update public.demandes_support_keyli set statut = 'traitee', note_admin = 'Répondu par email'
  where email = 'c-sup@test.local';
select is(
  (select format('%s|%s', statut, note_admin) from public.demandes_support_keyli where email = 'c-sup@test.local'),
  'traitee|Répondu par email', 'L''admin suit la demande (statut, note)');
select throws_ok(
  $$ update public.demandes_support_keyli set message = 'Modifié' $$,
  '42501', null, 'Le message d''origine ne se modifie pas');

select * from finish();
rollback;
