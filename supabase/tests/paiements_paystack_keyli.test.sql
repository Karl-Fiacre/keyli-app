-- Tests de la logique de paiement Paystack en base — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(20);

insert into auth.users (id, email, raw_user_meta_data) values
  ('dddd0000-0000-0000-0000-000000000001', 'proprio@test.local', '{"role_keyli": "owner"}'),
  ('dddd0000-0000-0000-0000-00000000000a', 'agence@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Paie"}'),
  ('dddd0000-0000-0000-0000-00000000000c', 'chercheur@test.local', '{}');

select set_config('test.plan_proprio', (select id::text from public.plans_keyli where code = 'proprietaire'), true);
select set_config('test.plan_moyenne', (select id::text from public.plans_keyli where code = 'agence_moyenne'), true);
select set_config('test.plan_grande', (select id::text from public.plans_keyli where code = 'grande_agence'), true);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- ------------------------------------------------------------
-- Démarrage d'un paiement (au nom de l'utilisateur)
-- ------------------------------------------------------------
select pg_temp.connecter('dddd0000-0000-0000-0000-00000000000c');  -- chercheur
select throws_ok($$ select * from public.initier_paiement_keyli(current_setting('test.plan_proprio')::uuid) $$,
  '42501', null, 'Un chercheur ne souscrit pas de forfait');

select pg_temp.connecter('dddd0000-0000-0000-0000-00000000000a');  -- agence
select throws_ok($$ select * from public.initier_paiement_keyli(current_setting('test.plan_proprio')::uuid) $$,
  '23514', null, 'Une agence ne paie pas le forfait Propriétaire');

select pg_temp.connecter('dddd0000-0000-0000-0000-000000000001');  -- propriétaire
select results_eq(
  $$ select montant, devise, plan_code from public.initier_paiement_keyli(current_setting('test.plan_proprio')::uuid) $$,
  $$ values (5000.00::numeric, 'XOF'::text, 'proprietaire'::text) $$,
  'Le montant est figé depuis plans_keyli (5 000 XOF), devise XOF');
select results_eq(
  $$ select status, amount from public.payment_attempts_keyli $$,
  $$ values ('initiated'::text, 5000::numeric) $$,
  'Une tentative « initiated » est créée pour le propriétaire');
select throws_ok(
  $$ select public.confirmer_paiement_keyli('X', 500000, 'XOF', '1') $$,
  '42501', null, 'Un utilisateur ne peut pas confirmer un paiement lui-même');

set local role postgres;
select set_config('test.ref1', (select paystack_reference from public.payment_attempts_keyli
  where user_id = 'dddd0000-0000-0000-0000-000000000001'), true);
select ok(current_setting('test.ref1') like 'KEYLI-%', 'La référence de paiement est générée par la base');

-- ------------------------------------------------------------
-- Confirmation (serveur : webhook signé ou vérification Paystack)
-- ------------------------------------------------------------
select throws_ok(
  $$ select public.confirmer_paiement_keyli(current_setting('test.ref1'), 100000, 'XOF', 'PS-1') $$,
  '23514', null, 'Un montant payé différent du forfait est refusé');
select is((select status from public.payment_attempts_keyli where paystack_reference = current_setting('test.ref1')),
  'initiated', 'Après un refus, la tentative reste « initiated » (l''échec est enregistré par l''Edge Function)');

select lives_ok(
  $$ select public.confirmer_paiement_keyli(current_setting('test.ref1'), 500000, 'XOF', 'PS-1') $$,
  'Paiement confirmé : 5 000 XOF envoyés à Paystack comme 500000');
select results_eq(
  $$ select status::text, amount, (end_date - start_date) between interval '28 days' and interval '31 days'
       from public.subscriptions_keyli where user_id = 'dddd0000-0000-0000-0000-000000000001' $$,
  $$ values ('active'::text, 5000.00::numeric, true) $$,
  'Première souscription : un abonnement actif d''un mois');
select is((select count(*)::int from public.transactions_keyli where paystack_ref = current_setting('test.ref1')),
  1, 'Une transaction « completed » est enregistrée');

select lives_ok(
  $$ select public.confirmer_paiement_keyli(current_setting('test.ref1'), 500000, 'XOF', 'PS-1') $$,
  'Un webhook rejoué est accepté sans effet');
select is((select count(*)::int from public.transactions_keyli where paystack_ref = current_setting('test.ref1')),
  1, 'Pas de transaction en double');

-- Renouvellement du même forfait avant l'échéance
select set_config('test.fin1', (select end_date::text from public.subscriptions_keyli
  where user_id = 'dddd0000-0000-0000-0000-000000000001' and status = 'active'), true);
set local role authenticated;
select pg_temp.connecter('dddd0000-0000-0000-0000-000000000001');
select set_config('test.ref2', (select reference from public.initier_paiement_keyli(current_setting('test.plan_proprio')::uuid)), true);
set local role postgres;
select public.confirmer_paiement_keyli(current_setting('test.ref2'), 500000, 'XOF', 'PS-2');
select is(
  (select end_date from public.subscriptions_keyli where user_id = 'dddd0000-0000-0000-0000-000000000001' and status = 'active'),
  current_setting('test.fin1')::timestamptz + interval '1 month',
  'Renouvellement : un mois de plus à partir de la fin actuelle (jours restants conservés)');
select is((select count(*)::int from public.subscriptions_keyli where user_id = 'dddd0000-0000-0000-0000-000000000001'),
  1, 'Le renouvellement prolonge l''abonnement existant');

-- Changement de forfait : Agence Moyenne puis Grande Agence
set local role authenticated;
select pg_temp.connecter('dddd0000-0000-0000-0000-00000000000a');
select set_config('test.ref3', (select reference from public.initier_paiement_keyli(current_setting('test.plan_moyenne')::uuid)), true);
select set_config('test.ref4', (select reference from public.initier_paiement_keyli(current_setting('test.plan_grande')::uuid)), true);
set local role postgres;
select public.confirmer_paiement_keyli(current_setting('test.ref3'), 1500000, 'XOF', 'PS-3');
select lives_ok(
  $$ select public.confirmer_paiement_keyli(current_setting('test.ref4'), 2500000, 'XOF', 'PS-4') $$,
  'Changement de forfait payé en cours de cycle');
select results_eq(
  $$ select p.code, s.status::text from public.subscriptions_keyli s join public.plans_keyli p on p.id = s.plan_id
      where s.user_id = 'dddd0000-0000-0000-0000-00000000000a' order by s.status desc $$,
  $$ values ('agence_moyenne'::text, 'canceled'::text), ('grande_agence'::text, 'active'::text) $$,
  'L''ancien forfait est clôturé, le nouveau s''applique immédiatement');
select ok(
  (select start_date <= now() and end_date > now() + interval '27 days'
     from public.subscriptions_keyli where user_id = 'dddd0000-0000-0000-0000-00000000000a' and status = 'active'),
  'Nouveau cycle d''un mois à partir du paiement, sans prorata');

select throws_ok(
  $$ select public.confirmer_paiement_keyli('KEYLI-inconnue', 500000, 'XOF', 'PS-X') $$,
  'P0002', null, 'Une référence inconnue est refusée');
set local role authenticated;
select pg_temp.connecter('dddd0000-0000-0000-0000-000000000001');
select set_config('test.ref5', (select reference from public.initier_paiement_keyli(current_setting('test.plan_proprio')::uuid)), true);
set local role postgres;
select throws_ok(
  $$ select public.confirmer_paiement_keyli(current_setting('test.ref5'), 500000, 'NGN', 'PS-5') $$,
  '23514', null, 'Une devise autre que XOF est refusée');

select * from finish();
rollback;
