-- Tests de subscriptions_keyli / transactions_keyli / payment_attempts_keyli
-- — exécutés par `npm run db:test` (pgTAP), en local, en CI et sur le
-- projet distant (`--linked`). Transaction annulée à la fin.
--
-- Les écritures « serveur » (Edge Functions Paystack, clé service_role qui
-- contourne la RLS) sont simulées en postgres : les triggers de garde-fou
-- s'appliquent quand même.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(22);

-- ------------------------------------------------------------
-- Comptes : P propriétaire, A agence, G grande agence, U chercheur
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'proprio@test.local', '{"role_keyli": "owner"}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'agence@test.local', '{"role_keyli": "agency"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'grande@test.local', '{"role_keyli": "agency"}'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'chercheur@test.local', '{}');

select set_config('test.plan_proprio', (select id::text from public.plans_keyli where code = 'proprietaire'), true);
select set_config('test.plan_moyenne', (select id::text from public.plans_keyli where code = 'agence_moyenne'), true);
select set_config('test.plan_grande', (select id::text from public.plans_keyli where code = 'grande_agence'), true);

-- ------------------------------------------------------------
-- Structure
-- ------------------------------------------------------------
select has_table('public', 'subscriptions_keyli', 'La table subscriptions_keyli existe');
select has_table('public', 'transactions_keyli', 'La table transactions_keyli existe');
select has_table('public', 'payment_attempts_keyli', 'La table payment_attempts_keyli existe');
select is(
  (select bool_and(relrowsecurity) from pg_class where oid in (
     'public.subscriptions_keyli'::regclass, 'public.transactions_keyli'::regclass,
     'public.payment_attempts_keyli'::regclass)),
  true,
  'RLS est activée sur les trois tables'
);
select has_column('public', 'payment_attempts_keyli', 'plan_id', 'payment_attempts_keyli référence plans_keyli');
select hasnt_column('public', 'payment_attempts_keyli', 'plan_type', 'L''ancien plan_type TEXT n''existe plus');

-- ------------------------------------------------------------
-- Écritures serveur (webhook Paystack confirmé)
-- ------------------------------------------------------------
select lives_ok(
  $$ insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date) values
       ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.plan_proprio')::uuid, 5000, now(), now() + interval '1 month'),
       ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_setting('test.plan_moyenne')::uuid, 15000, now(), now() + interval '1 month') $$,
  'Le serveur active un abonnement propriétaire et un abonnement agence'
);
select lives_ok(
  $$ insert into public.subscriptions_keyli
       (user_id, plan_id, amount, start_date, end_date, prix_depassement_negocie, montant_depassement_negocie, conditions_negociees)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', current_setting('test.plan_grande')::uuid, 25000, now(), now() + interval '1 month',
             700, 40000, 'Négocié avec le super_admin') $$,
  'Une Grande Agence peut porter une formule personnalisée'
);
select throws_ok(
  $$ insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.plan_proprio')::uuid, 5000, now(), now() + interval '1 month') $$,
  '23505', null,
  'Un seul abonnement actif par compte'
);
select throws_ok(
  $$ update public.subscriptions_keyli set plan_id = current_setting('test.plan_proprio')::uuid
      where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '23514', null,
  'Une agence ne peut pas passer au forfait Propriétaire'
);
select throws_ok(
  $$ insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
     values ('dddddddd-dddd-dddd-dddd-dddddddddddd', current_setting('test.plan_proprio')::uuid, 5000, now(), now() + interval '1 month') $$,
  '23514', null,
  'Un chercheur ne s''abonne pas (aucun paywall chercheur)'
);
select throws_ok(
  $$ update public.subscriptions_keyli set prix_depassement_negocie = 500
      where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '23514', null,
  'Pas de formule personnalisée hors Grande Agence'
);
select throws_ok(
  $$ insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date, status)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.plan_proprio')::uuid, 5000, now(), now() - interval '1 day', 'expired') $$,
  '23514', null,
  'Une période d''abonnement doit finir après son début'
);

-- Forfait désactivé : plus souscriptible, mais l'abonné garde l'accès
update public.plans_keyli set actif = false where code = 'proprietaire';
select throws_ok(
  $$ insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date, status)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.plan_proprio')::uuid, 5000, now(), now() + interval '1 month', 'expired') $$,
  '23514', null,
  'On ne souscrit pas à un forfait désactivé'
);

insert into public.transactions_keyli (user_id, subscription_id, amount, status, paystack_ref)
  select user_id, id, amount, 'completed', 'PSK-REF-001' from public.subscriptions_keyli
   where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select throws_ok(
  $$ insert into public.transactions_keyli (user_id, amount, status, paystack_ref)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 5000, 'completed', 'PSK-REF-001') $$,
  '23505', null,
  'Un webhook Paystack rejoué ne crée pas de transaction en double'
);
select throws_ok(
  $$ insert into public.payment_attempts_keyli (user_id, plan_id, amount, status)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.plan_proprio')::uuid, 5000, 'peut-etre') $$,
  '23514', null,
  'Le statut d''une tentative de paiement est contrôlé'
);
insert into public.payment_attempts_keyli (user_id, plan_id, amount)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.plan_proprio')::uuid, 5000);

-- ------------------------------------------------------------
-- Propriétaire P connecté
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}', true);

select results_eq(
  $$ select (select count(*) from public.subscriptions_keyli)::int,
            (select count(*) from public.transactions_keyli)::int,
            (select count(*) from public.payment_attempts_keyli)::int $$,
  $$ values (1, 1, 1) $$,
  'Un utilisateur ne voit que son abonnement, sa transaction et sa tentative'
);
select results_eq(
  $$ select p.code from public.subscriptions_keyli s join public.plans_keyli p on p.id = s.plan_id $$,
  $$ values ('proprietaire'::text) $$,
  'Un abonné voit encore son forfait, même désactivé depuis'
);
select throws_ok(
  $$ insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date, status)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.plan_moyenne')::uuid, 0, now(), now() + interval '1 year', 'expired') $$,
  '42501', null,
  'Un utilisateur ne peut pas s''attribuer un abonnement'
);
select throws_ok(
  $$ update public.subscriptions_keyli set end_date = now() + interval '10 years' $$,
  '42501', null,
  'Un utilisateur ne peut pas prolonger son abonnement'
);
select throws_ok(
  $$ insert into public.transactions_keyli (user_id, amount, status)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 5000, 'completed') $$,
  '42501', null,
  'Un utilisateur ne peut pas déclarer un paiement'
);

-- ------------------------------------------------------------
-- Visiteur anonyme
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok(
  $$ select * from public.subscriptions_keyli $$,
  '42501', null,
  'Un visiteur anonyme ne lit aucun abonnement'
);

set local role postgres;
select * from finish();
rollback;
