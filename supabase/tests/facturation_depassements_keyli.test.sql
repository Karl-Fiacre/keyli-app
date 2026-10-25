-- Tests de la facturation des dépassements — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant (`--linked`).
-- Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(27);

-- ------------------------------------------------------------
-- Comptes :
--   P  propriétaire, forfait Propriétaire (seuil 4, 1 500 XOF), 5 annonces
--      en ligne depuis 2 mois → 2 cycles clôturés en dépassement
--   R  propriétaire renouvelé : 4 annonces du cycle précédent archivées
--   M  agence, Agence Moyenne, 10 annonces (au seuil, ne peut dépasser)
--   G  agence, Grande Agence avec montant mensuel négocié 40 000 XOF, 31 annonces
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('ffff0000-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}'),
  ('ffff0000-0000-0000-0000-000000000002', 'r@test.local', '{"role_keyli": "owner"}'),
  ('ffff0000-0000-0000-0000-000000000003', 'm@test.local', '{"role_keyli": "agency", "nom_agence": "Agence M"}'),
  ('ffff0000-0000-0000-0000-000000000004', 'g@test.local', '{"role_keyli": "agency", "nom_agence": "Agence G"}');

insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date, montant_depassement_negocie)
select u.id, p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month', u.nego
  from (values
    ('ffff0000-0000-0000-0000-000000000001'::uuid, 'proprietaire',   null::numeric),
    ('ffff0000-0000-0000-0000-000000000002'::uuid, 'proprietaire',   null),
    ('ffff0000-0000-0000-0000-000000000003'::uuid, 'agence_moyenne', null),
    ('ffff0000-0000-0000-0000-000000000004'::uuid, 'grande_agence',  40000)
  ) as u(id, code, nego)
  join public.plans_keyli p on p.code = u.code;

insert into public.documents_keyli (user_id, doc_type, file_url, status)
select id, 'registre', id::text || '/registre.pdf', 'approved'
  from unnest(array['ffff0000-0000-0000-0000-000000000003', 'ffff0000-0000-0000-0000-000000000004']::uuid[]) as id;

-- Publications (écriture serveur : le trigger contrôle quand même le forfait)
create function pg_temp.publier(proprio uuid, n integer, accord boolean default false) returns void
language sql as $$
  insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation, accepte_depassement)
  select proprio, 'Annonce ' || g, 'appartement', 'a_louer', 100000, 'Abidjan', 'SRID=4326;POINT(-4.0 5.3)', accord
    from generate_series(1, n) g;
$$;
select pg_temp.publier('ffff0000-0000-0000-0000-000000000001', 4);
select pg_temp.publier('ffff0000-0000-0000-0000-000000000001', 1, true);   -- 5e : dépassement accepté
select pg_temp.publier('ffff0000-0000-0000-0000-000000000002', 4);
select pg_temp.publier('ffff0000-0000-0000-0000-000000000003', 10);
select pg_temp.publier('ffff0000-0000-0000-0000-000000000004', 31);         -- au-delà de 30 : couvert par la formule

-- Mise en situation dans le temps
--  P : abonnement commencé il y a 2 mois et 1 jour (renouvelé), annonces en ligne depuis
update public.subscriptions_keyli set start_date = now() - interval '2 months 1 day'
 where user_id = 'ffff0000-0000-0000-0000-000000000001';
update public.property_publications_keyli set published_at = now() - interval '2 months'
 where owner_id = 'ffff0000-0000-0000-0000-000000000001';
--  R : renouvelé il y a 1 jour ; ses 4 annonces ont été retirées pendant le cycle précédent
update public.subscriptions_keyli set start_date = now() - interval '1 month 1 day'
 where user_id = 'ffff0000-0000-0000-0000-000000000002';
update public.property_publications_keyli
   set published_at = now() - interval '1 month', unpublished_at = now() - interval '20 days'
 where owner_id = 'ffff0000-0000-0000-0000-000000000002';
update public.properties_keyli set archived_at = now() - interval '20 days'
 where owner_id = 'ffff0000-0000-0000-0000-000000000002';
--  M et G : un cycle clôturé
update public.subscriptions_keyli set start_date = now() - interval '1 month 1 day'
 where user_id in ('ffff0000-0000-0000-0000-000000000003', 'ffff0000-0000-0000-0000-000000000004');
update public.property_publications_keyli set published_at = now() - interval '1 month'
 where owner_id in ('ffff0000-0000-0000-0000-000000000003', 'ffff0000-0000-0000-0000-000000000004');

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ------------------------------------------------------------
-- Cycles mensuels
-- ------------------------------------------------------------
select results_eq(
  $$ select * from public.cycle_abonnement_keyli('2026-01-31 00:00+00', '2027-01-01 00:00+00', '2026-02-28 12:00+00') $$,
  $$ values ('2026-02-28 00:00+00'::timestamptz, '2026-03-31 00:00+00'::timestamptz) $$,
  'Fin de mois : le cycle commencé un 31 contient bien l''instant demandé');
select results_eq(
  $$ select * from public.cycle_abonnement_keyli('2026-01-10 00:00+00', '2026-02-20 00:00+00', '2026-02-15 00:00+00') $$,
  $$ values ('2026-02-10 00:00+00'::timestamptz, '2026-02-20 00:00+00'::timestamptz) $$,
  'Le dernier cycle est borné par la fin de l''abonnement');

set local role authenticated;
select pg_temp.connecter('ffff0000-0000-0000-0000-000000000002');
select results_eq($$ select statut, publications_cycle from public.etat_publication_keyli() $$,
  $$ values ('incluse'::text, 0) $$,
  'Après renouvellement, le seuil repart sur le nouveau cycle mensuel (et non sur toute la durée de l''abonnement)');

select pg_temp.connecter('ffff0000-0000-0000-0000-000000000001');
select results_eq($$ select statut, publications_cycle, prix_depassement from public.etat_publication_keyli() $$,
  $$ values ('depassement'::text, 5, 1500.00::numeric) $$,
  'Les annonces toujours en ligne comptent dans le cycle en cours');
select throws_ok($$ select public.cloturer_cycles_keyli() $$,
  '42501', null, 'Un utilisateur ne peut pas clôturer les cycles');

-- ------------------------------------------------------------
-- Clôture des cycles
-- ------------------------------------------------------------
set local role postgres;
select is(public.cloturer_cycles_keyli(), 5, 'Clôture : 2 cycles pour P, 1 pour R, M et G');
select is(public.cloturer_cycles_keyli(), 0, 'Rejouée, la clôture n''enregistre rien de plus');

select results_eq(
  $$ select nb_publications, nb_depassement, prix_unitaire, montant, statut
       from public.depassements_cycle_keyli where user_id = 'ffff0000-0000-0000-0000-000000000001' order by cycle_debut $$,
  $$ values (5, 1, 1500.00::numeric, 1500.00::numeric, 'a_payer'::text),
            (5, 1, 1500.00::numeric, 1500.00::numeric, 'a_payer'::text) $$,
  'Dépassement mensuel : la 5e annonce coûte 1 500 XOF à chaque cycle où elle reste en ligne');
select results_eq(
  $$ select nb_publications, montant, statut from public.depassements_cycle_keyli
      where user_id = 'ffff0000-0000-0000-0000-000000000002' $$,
  $$ values (4, 0.00::numeric, 'neant'::text) $$,
  'Sans dépassement : cycle enregistré, rien à payer');
select results_eq(
  $$ select nb_publications, nb_depassement, montant, en_depassement, statut from public.depassements_cycle_keyli
      where user_id = 'ffff0000-0000-0000-0000-000000000003' $$,
  $$ values (10, 0, 0.00::numeric, true, 'neant'::text) $$,
  'Agence Moyenne au seuil : rien à payer, mais comptée en dépassement pour la recommandation');
select results_eq(
  $$ select nb_depassement, prix_unitaire, montant, statut from public.depassements_cycle_keyli
      where user_id = 'ffff0000-0000-0000-0000-000000000004' $$,
  $$ values (1, null::numeric, 40000.00::numeric, 'a_payer'::text) $$,
  'Grande Agence au-delà de 30 : le montant mensuel négocié est dû pour ce cycle');

-- Notifications
select is((select count(*)::int from public.notifications_keyli
            where user_id = 'ffff0000-0000-0000-0000-000000000001' and type = 'depassement_cycle'),
  2, 'Une notification de dépassement par cycle facturé');
select ok((select contenu like '%Agence Moyenne%' from public.notifications_keyli
            where user_id = 'ffff0000-0000-0000-0000-000000000001' and type = 'recommandation_forfait'),
  '2 cycles d''affilée en dépassement : le forfait supérieur est recommandé');
select is((select count(*)::int from public.notifications_keyli
            where type = 'recommandation_forfait' and user_id <> 'ffff0000-0000-0000-0000-000000000001'),
  0, 'Un seul cycle en dépassement, ou formule négociée : pas de recommandation');

-- Lecture : chacun ses dépassements
set local role authenticated;
select pg_temp.connecter('ffff0000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.depassements_cycle_keyli), 2, 'Un compte lit ses seuls dépassements');
select throws_ok($$ update public.depassements_cycle_keyli set statut = 'paye' $$,
  '42501', null, 'Un compte ne peut pas marquer ses dépassements payés');

-- ------------------------------------------------------------
-- Paiement : forfait + dépassements impayés
-- ------------------------------------------------------------
select results_eq(
  $$ select montant, montant_forfait, montant_depassements
       from public.initier_paiement_keyli((select id from public.plans_keyli where code = 'proprietaire')) $$,
  $$ values (8000.00::numeric, 5000.00::numeric, 3000.00::numeric) $$,
  'Le paiement du forfait inclut les 3 000 XOF de dépassements impayés');
select results_eq(
  $$ select montant, montant_depassements
       from public.initier_paiement_keyli((select id from public.plans_keyli where code = 'proprietaire')) $$,
  $$ values (5000.00::numeric, 0.00::numeric) $$,
  'Un second paiement lancé aussitôt ne refacture pas les dépassements déjà inclus');

set local role postgres;
select set_config('test.ref', (select paystack_reference from public.payment_attempts_keyli
  where user_id = 'ffff0000-0000-0000-0000-000000000001' and montant_depassements > 0), true);
select throws_ok(
  $$ select public.confirmer_paiement_keyli(current_setting('test.ref'), 500000, 'XOF', 'PS-1') $$,
  '23514', null, 'Payer le forfait seul quand des dépassements sont dus est refusé');
select lives_ok(
  $$ select public.confirmer_paiement_keyli(current_setting('test.ref'), 800000, 'XOF', 'PS-1') $$,
  'Paiement de 8 000 XOF confirmé');
select is((select count(*)::int from public.depassements_cycle_keyli
            where user_id = 'ffff0000-0000-0000-0000-000000000001' and statut = 'paye' and transaction_id is not null),
  2, 'Les dépassements inclus sont marqués payés et rattachés à la transaction');
select is((select amount from public.transactions_keyli where paystack_ref = current_setting('test.ref')),
  8000.00::numeric, 'La transaction porte le montant total payé');
select is((select amount from public.subscriptions_keyli where user_id = 'ffff0000-0000-0000-0000-000000000001'),
  5000.00::numeric, 'L''abonnement garde le prix du forfait seul');

-- Changement de forfait : l'ancien est clôturé à la date du changement, son
-- dernier cycle partiel devient facturable
set local role authenticated;
select pg_temp.connecter('ffff0000-0000-0000-0000-000000000003');
select set_config('test.ref_m', (select reference from public.initier_paiement_keyli(
  (select id from public.plans_keyli where code = 'grande_agence'))), true);
set local role postgres;
select public.confirmer_paiement_keyli(current_setting('test.ref_m'), 2500000, 'XOF', 'PS-M');
select ok((select end_date <= now() from public.subscriptions_keyli
            where user_id = 'ffff0000-0000-0000-0000-000000000003' and status = 'canceled'),
  'Changement de forfait : l''ancien abonnement est clôturé à la date du changement');
select is((select amount from public.subscriptions_keyli
            where user_id = 'ffff0000-0000-0000-0000-000000000003' and status = 'active'),
  25000.00::numeric, 'Le nouvel abonnement porte le prix de son forfait');
select is(public.cloturer_cycles_keyli(), 1, 'Le cycle partiel de l''ancien abonnement est clôturé');

select ok(exists (select 1 from cron.job where jobname = 'keyli-cloture-cycles' and schedule = '10 * * * *'),
  'La clôture est planifiée toutes les heures');

select * from finish();
rollback;
