-- Tests du Sprint 9 — fiabilisation des paiements
-- (migration 20261116120000_fiabilisation_paiements_keyli.sql).
-- Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(25);

insert into auth.users (id, email, raw_user_meta_data) values
  ('d9000000-0000-0000-0000-000000000001', 'proprio.paie9@test.local', '{"role_keyli": "owner"}'),
  ('d9000000-0000-0000-0000-000000000005', 'admin.paie9@test.local', '{}');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'd9000000-0000-0000-0000-000000000005';

select set_config('test.plan', (select id::text from public.plans_keyli where code = 'proprietaire'), true);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Tentatives de test (âges différents)
--   A : en cours depuis 20 min       B : en cours depuis 5 min
--   C : refusée il y a 2 h (motif)   D : échec de configuration (sans motif)
--   E : en cours depuis 25 h         F : en cours depuis 2 h, jamais vérifiée
insert into public.payment_attempts_keyli (user_id, email, plan_id, amount, status, paystack_reference, motif_refus, created_at)
values
  ('d9000000-0000-0000-0000-000000000001', 'proprio.paie9@test.local', current_setting('test.plan')::uuid, 5000, 'initiated', 'T9-A', null, now() - interval '20 minutes'),
  ('d9000000-0000-0000-0000-000000000001', 'proprio.paie9@test.local', current_setting('test.plan')::uuid, 5000, 'initiated', 'T9-B', null, now() - interval '5 minutes'),
  ('d9000000-0000-0000-0000-000000000001', 'proprio.paie9@test.local', current_setting('test.plan')::uuid, 5000, 'failed', 'T9-C', 'Declined', now() - interval '2 hours'),
  ('d9000000-0000-0000-0000-000000000001', 'proprio.paie9@test.local', current_setting('test.plan')::uuid, 5000, 'failed', 'T9-D', null, now() - interval '2 hours'),
  ('d9000000-0000-0000-0000-000000000001', 'proprio.paie9@test.local', current_setting('test.plan')::uuid, 5000, 'initiated', 'T9-E', null, now() - interval '25 hours'),
  ('d9000000-0000-0000-0000-000000000001', 'proprio.paie9@test.local', current_setting('test.plan')::uuid, 5000, 'initiated', 'T9-F', null, now() - interval '2 hours');

-- ------------------------------------------------------------
-- Droits : fonctions serveur fermées aux comptes
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('d9000000-0000-0000-0000-000000000001');
select throws_ok($$ select * from public.prendre_paiements_a_verifier_keyli() $$,
  '42501', null, 'Un compte ne prend pas de lot de paiements à vérifier');
select throws_ok($$ select public.echec_paiement_keyli('T9-A', 'x') $$,
  '42501', null, 'Un compte n''enregistre pas d''échec de paiement');
select throws_ok($$ select public.surveiller_paiements_keyli() $$,
  '42501', null, 'Un compte ne lance pas la surveillance');
select throws_ok($$ select * from public.controles_paiements_keyli() $$,
  '42501', null, 'Un non-admin ne lit pas les contrôles');
select throws_ok($$ select * from public.synthese_paiements_keyli(current_date - 7, current_date) $$,
  '42501', null, 'Un non-admin ne lit pas la synthèse des paiements');
select throws_ok($$ select * from public.paiements_admin_keyli() $$,
  '42501', null, 'Un non-admin ne lit pas la liste des paiements');
select is((select count(*)::int from public.payment_attempts_keyli where paystack_reference like 'T9-%'),
  6, 'L''annonceur lit ses propres tentatives (bandeau de refus)');
set local role postgres;

-- ------------------------------------------------------------
-- Rattrapage : lot de paiements à vérifier
-- ------------------------------------------------------------
select results_eq(
  $$ select reference from public.prendre_paiements_a_verifier_keyli(50)
      where reference like 'T9-%' order by reference $$,
  $$ values ('T9-A'::text), ('T9-C'::text), ('T9-E'::text), ('T9-F'::text) $$,
  'Lot : en cours depuis plus de 15 min et refus de moins de 24 h (pas B trop récent, ni D sans motif)');
select is((select verifications from public.payment_attempts_keyli where paystack_reference = 'T9-A'),
  1, 'La vérification est comptée et datée');
select is(
  (select count(*)::int from public.prendre_paiements_a_verifier_keyli(50) where reference like 'T9-%'),
  0, 'Un paiement n''est pas revérifié avant une heure');
select results_eq(
  $$ select reference from public.prendre_paiements_a_verifier_keyli(20, 'T9-B') $$,
  $$ values ('T9-B'::text) $$,
  'Vérification demandée par un admin : immédiate, même pour un paiement récent');

-- ------------------------------------------------------------
-- Refus et abandon
-- ------------------------------------------------------------
select public.echec_paiement_keyli('T9-A', 'Paiement failed : Insufficient Funds', 'Insufficient Funds', true);
select results_eq(
  $$ select status, motif_refus from public.payment_attempts_keyli where paystack_reference = 'T9-A' $$,
  $$ values ('failed'::text, 'Insufficient Funds'::text) $$,
  'Refus : statut « failed » et motif de la banque conservé');
select is(
  (select count(*)::int from public.notifications_keyli
    where user_id = 'd9000000-0000-0000-0000-000000000001' and type = 'paiement_echoue'),
  1, 'L''annonceur est prévenu du refus');
select public.echec_paiement_keyli('T9-A', 'rejoué', 'Insufficient Funds', true);
select is(
  (select count(*)::int from public.notifications_keyli
    where user_id = 'd9000000-0000-0000-0000-000000000001' and type = 'paiement_echoue'),
  1, 'Un refus rejoué ne prévient pas deux fois');
select public.echec_paiement_keyli('T9-F', 'Initialisation Paystack refusée : clé invalide');
select is(
  (select count(*)::int from public.notifications_keyli
    where user_id = 'd9000000-0000-0000-0000-000000000001' and type = 'paiement_echoue'),
  1, 'Une panne de configuration ne prévient pas l''annonceur');
select ok(public.notification_par_email_keyli('paiement_echoue'), 'Le refus de paiement part aussi par email');

select is(public.abandonner_paiement_keyli('T9-B'), false,
  'Un paiement récent n''est pas abandonné (la page Paystack peut encore aboutir)');
select is(public.abandonner_paiement_keyli('T9-E'), true, 'Sans issue après 24 h : abandonné');
select is(public.abandonner_paiement_keyli('T9-B', true), true,
  'Retour sur Keyli avec un paiement abandonné : abandon immédiat');

-- ------------------------------------------------------------
-- Surveillance : échéance oubliée corrigée, anomalie journalisée
-- ------------------------------------------------------------
update public.subscriptions_keyli set status = 'expired'
 where user_id = 'd9000000-0000-0000-0000-000000000001' and status = 'active';
insert into public.subscriptions_keyli (user_id, plan_id, amount, status, start_date, end_date)
values ('d9000000-0000-0000-0000-000000000001', current_setting('test.plan')::uuid, 5000, 'active',
        now() - interval '1 month', now() - interval '3 hours');
select ok(
  (select nombre >= 1 from public.anomalies_paiements_keyli() where controle = 'echeances_non_traitees'),
  'Un forfait échu encore actif est détecté');
select ok(public.surveiller_paiements_keyli() >= 0, 'La surveillance s''exécute');
select is(
  (select status::text from public.subscriptions_keyli
    where user_id = 'd9000000-0000-0000-0000-000000000001' order by created_at desc limit 1),
  'expired', 'La surveillance traite aussitôt l''échéance oubliée');
select ok(
  exists (select 1 from public.erreurs_client_keyli
           where page = '/tache/surveillance-paiements' and code = 'corrige'),
  'La correction est inscrite au journal des erreurs');

-- ------------------------------------------------------------
-- Back-office (admin)
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('d9000000-0000-0000-0000-000000000005');
select is((select count(*)::int from public.controles_paiements_keyli()), 7, 'L''admin lit les 7 contrôles');
select ok(
  (select abandonnes >= 2 and echoues >= 3 from public.synthese_paiements_keyli(current_date - 2, current_date)),
  'Synthèse : tentatives comptées par statut');

select * from finish();
rollback;
