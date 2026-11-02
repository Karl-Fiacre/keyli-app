-- Tests des séjours courts et demandes de réservation (migration
-- 20261106120000_reservations_sejours_keyli) — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant. Transaction annulée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(35);

-- H hôte abonné ; V1, V2, V3 voyageurs
insert into auth.users (id, email, raw_user_meta_data) values
  ('e5e00000-0000-0000-0000-000000000001', 'h-sejour@test.local', '{"role_keyli": "owner"}'),
  ('e5e00000-0000-0000-0000-000000000002', 'v1-sejour@test.local', '{"role_keyli": "user"}'),
  ('e5e00000-0000-0000-0000-000000000003', 'v2-sejour@test.local', '{"role_keyli": "user"}'),
  ('e5e00000-0000-0000-0000-000000000004', 'v3-sejour@test.local', '{"role_keyli": "user"}');

insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'e5e00000-0000-0000-0000-000000000001', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.photo() returns text
language sql volatile as $$
  select 'https://res.cloudinary.com/' || public.cloudinary_cloud_keyli()
      || '/image/upload/keyli/annonces/' || (select auth.uid())::text || '/' || gen_random_uuid()::text || '.jpg';
$$;
grant execute on function pg_temp.photo() to authenticated;

-- Jour J + n (dates relatives : le test reste valable dans le temps)
create function pg_temp.j(n integer) returns date
language sql stable as $$ select (now() at time zone 'Africa/Abidjan')::date + n $$;
grant execute on function pg_temp.j(integer) to authenticated;

set local role authenticated;
select pg_temp.connecter('e5e00000-0000-0000-0000-000000000001');

-- ------------------------------------------------------------
-- Publication
-- ------------------------------------------------------------
-- Appartement en séjour court : 30 000 / nuit, 2 nuits minimum, 4 voyageurs
select set_config('test.appart', public.publier_annonce_keyli(
  'Appartement Riviera', 'appartement', 'a_louer', 30000, 'Abidjan', 5.35, -3.98, array[pg_temp.photo()],
  p_sejour_court => true, p_nuits_min => 2, p_voyageurs_max => 4)::text, true);
-- Hôtel : séjour court imposé même sans le demander
select set_config('test.hotel', public.publier_annonce_keyli(
  'Hôtel du Plateau', 'hotel', 'a_louer', 50000, 'Abidjan', 5.32, -4.02, array[pg_temp.photo()])::text, true);
-- Location au mois classique
select set_config('test.mois', public.publier_annonce_keyli(
  'Villa Cocody', 'villa', 'a_louer', 400000, 'Abidjan', 5.36, -3.99, array[pg_temp.photo()])::text, true);

select is((select sejour_court from public.properties_keyli where id = current_setting('test.hotel')::uuid),
  true, 'Un hôtel à louer est toujours en séjour court');
select is((select sejour_court from public.properties_keyli where id = current_setting('test.mois')::uuid),
  false, 'Une location au mois n''est pas un séjour court');
select throws_ok(
  $$ select public.publier_annonce_keyli('Maison à vendre', 'maison', 'a_vendre', 9000000, 'Abidjan', 5.3, -4.0,
       array[pg_temp.photo()], p_sejour_court => true) $$,
  '23514', 'Un séjour court est forcément une location', 'Séjour court en vente refusé');

-- ------------------------------------------------------------
-- Types de chambres
-- ------------------------------------------------------------
select lives_ok(
  $$ insert into public.types_chambres_keyli (property_id, nom, quantite, prix_nuit, voyageurs_max)
     values (current_setting('test.hotel')::uuid, 'Double standard', 2, 25000, 2),
            (current_setting('test.hotel')::uuid, 'Suite', 1, 60000, 4) $$,
  'L''hôtelier ajoute ses types de chambres');
select is((select price from public.properties_keyli where id = current_setting('test.hotel')::uuid),
  25000::numeric, 'Le prix affiché de l''hôtel suit sa chambre la moins chère');
select throws_ok(
  $$ insert into public.types_chambres_keyli (property_id, nom, quantite, prix_nuit, voyageurs_max)
     values (current_setting('test.appart')::uuid, 'Chambre', 1, 10000, 2) $$,
  '23514', 'Les types de chambres sont réservés aux hôtels et auberges', 'Pas de chambres sur un appartement');
select set_config('test.double', (select id::text from public.types_chambres_keyli
  where property_id = current_setting('test.hotel')::uuid and nom = 'Double standard'), true);

select pg_temp.connecter('e5e00000-0000-0000-0000-000000000002');
select throws_ok(
  $$ insert into public.types_chambres_keyli (property_id, nom, quantite, prix_nuit, voyageurs_max)
     values (current_setting('test.hotel')::uuid, 'Pirate', 1, 1000, 2) $$,
  '42501', null, 'Un autre compte n''ajoute pas de chambre');

-- ------------------------------------------------------------
-- Devis (calculé par la base)
-- ------------------------------------------------------------
select results_eq(
  $$ select nuits, montant_total, motif from public.devis_sejour_keyli(
       current_setting('test.appart')::uuid, null, pg_temp.j(10), pg_temp.j(13), 2) $$,
  $$ values (3, 90000::numeric, null::text) $$, 'Devis : 3 nuits × 30 000 = 90 000');
select is((select motif from public.devis_sejour_keyli(
  current_setting('test.appart')::uuid, null, pg_temp.j(10), pg_temp.j(11), 2)),
  'Séjour de 2 nuit(s) minimum', 'Durée minimum contrôlée');
select is((select motif from public.devis_sejour_keyli(
  current_setting('test.appart')::uuid, null, pg_temp.j(10), pg_temp.j(13), 5)),
  '4 voyageur(s) au plus', 'Capacité en voyageurs contrôlée');
select is((select motif from public.devis_sejour_keyli(
  current_setting('test.appart')::uuid, null, pg_temp.j(-2), pg_temp.j(1), 2)),
  'La date d''arrivée est déjà passée', 'Arrivée dans le passé refusée');
select is((select motif from public.devis_sejour_keyli(
  current_setting('test.mois')::uuid, null, pg_temp.j(10), pg_temp.j(13), 2)),
  'Cette annonce ne se réserve pas à la nuit', 'Location au mois non réservable à la nuit');
select results_eq(
  $$ select montant_total, motif from public.devis_sejour_keyli(
       current_setting('test.hotel')::uuid, current_setting('test.double')::uuid, pg_temp.j(10), pg_temp.j(12), 4, 2) $$,
  $$ values (100000::numeric, null::text) $$, 'Hôtel : 2 chambres × 2 nuits × 25 000 = 100 000');
select is((select motif from public.devis_sejour_keyli(
  current_setting('test.hotel')::uuid, null, pg_temp.j(10), pg_temp.j(12), 2)),
  'Choisissez un type de chambre', 'Hôtel : type de chambre obligatoire');

-- ------------------------------------------------------------
-- Demandes, acceptation, refus automatique
-- ------------------------------------------------------------
select set_config('test.r1', public.demander_reservation_keyli(
  current_setting('test.appart')::uuid, null, pg_temp.j(10), pg_temp.j(13), 2, 1, 'Bonjour !')::text, true);
select is((select montant_total from public.reservations_keyli where id = current_setting('test.r1')::uuid),
  90000::numeric, 'La demande enregistre le total calculé par la base');
select is((select count(*)::int from public.messages_keyli
             where property_id = current_setting('test.appart')::uuid and body like 'Demande de réservation du %Bonjour !'),
  1, 'La demande ouvre la conversation avec l''hôte (message visible des deux)');
select throws_ok(
  $$ select public.demander_reservation_keyli(current_setting('test.appart')::uuid, null, pg_temp.j(20), pg_temp.j(22), 2) $$,
  '23514', 'Vous avez déjà une demande en attente pour cette annonce', 'Une seule demande en attente par annonce');
select throws_ok(
  $$ insert into public.reservations_keyli (property_id, voyageur_id, owner_id, date_arrivee, date_depart, voyageurs,
       prix_nuit, montant_total)
     values (current_setting('test.appart')::uuid, auth.uid(), auth.uid(), pg_temp.j(30), pg_temp.j(32), 1, 1, 1) $$,
  '42501', null, 'Aucune écriture directe dans les réservations');
select throws_ok(
  $$ select public.repondre_reservation_keyli(current_setting('test.r1')::uuid, true) $$,
  '42501', 'Réservation introuvable', 'Le voyageur ne répond pas à sa propre demande');

-- V2 demande les mêmes nuits : une demande ne bloque pas les dates
select pg_temp.connecter('e5e00000-0000-0000-0000-000000000003');
select set_config('test.r2', public.demander_reservation_keyli(
  current_setting('test.appart')::uuid, null, pg_temp.j(11), pg_temp.j(14), 2)::text, true);
select is((select count(*)::int from public.reservations_keyli where id = current_setting('test.r1')::uuid),
  0, 'Un voyageur ne voit pas la demande d''un autre');

-- L'hôte accepte V1 : la demande de V2 (mêmes nuits) est refusée d'office
select pg_temp.connecter('e5e00000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.demander_reservation_keyli(current_setting('test.appart')::uuid, null, pg_temp.j(40), pg_temp.j(42), 2) $$,
  '23514', 'Vous ne pouvez pas réserver votre propre annonce', 'L''hôte ne réserve pas sa propre annonce');
select is((select count(*)::int from public.notifications_keyli where type = 'reservation_demandee'),
  2, 'L''hôte est notifié de chaque demande');
select lives_ok($$ select public.repondre_reservation_keyli(current_setting('test.r1')::uuid, true) $$,
  'L''hôte accepte la demande');
select results_eq(
  $$ select statut::text, motif from public.reservations_keyli where id = current_setting('test.r2')::uuid $$,
  $$ values ('refusee', 'Dates plus disponibles') $$, 'La demande concurrente est refusée d''office');
select is((select motif from public.devis_sejour_keyli(
  current_setting('test.appart')::uuid, null, pg_temp.j(12), pg_temp.j(15), 2)),
  'Ces dates ne sont plus disponibles', 'Les nuits acceptées sont bloquées');
select is((select count(*)::int from public.rechercher_annonces_keyli(
  p_arrivee => pg_temp.j(11), p_depart => pg_temp.j(13)) where id = current_setting('test.appart')::uuid),
  0, 'Recherche par dates : logement réservé exclu');
select is((select count(*)::int from public.rechercher_annonces_keyli(
  p_arrivee => pg_temp.j(13), p_depart => pg_temp.j(15)) where id = current_setting('test.appart')::uuid),
  1, 'Recherche par dates : libre dès le jour du départ précédent');
select is((select count(*)::int from public.rechercher_annonces_keyli(p_sejour => true)
  where id = current_setting('test.mois')::uuid),
  0, 'Filtre séjour court : la location au mois est exclue');

-- Hôtel : 2 chambres « Double ». V1 en prend 2, la demande de V3 pour 1 tombe
select pg_temp.connecter('e5e00000-0000-0000-0000-000000000002');
select set_config('test.h1', public.demander_reservation_keyli(
  current_setting('test.hotel')::uuid, current_setting('test.double')::uuid, pg_temp.j(20), pg_temp.j(22), 4, 2)::text, true);
select pg_temp.connecter('e5e00000-0000-0000-0000-000000000004');
select set_config('test.h2', public.demander_reservation_keyli(
  current_setting('test.hotel')::uuid, current_setting('test.double')::uuid, pg_temp.j(21), pg_temp.j(23), 2, 1)::text, true);
select pg_temp.connecter('e5e00000-0000-0000-0000-000000000001');
select public.repondre_reservation_keyli(current_setting('test.h1')::uuid, true);
select is((select statut::text from public.reservations_keyli where id = current_setting('test.h2')::uuid),
  'refusee', 'Hôtel : plus de chambre libre, la demande en trop est refusée');
select is((select count(*)::int from public.rechercher_annonces_keyli(
  p_arrivee => pg_temp.j(20), p_depart => pg_temp.j(22), p_voyageurs => 2) where id = current_setting('test.hotel')::uuid),
  1, 'Hôtel encore proposé : la suite reste libre');

-- ------------------------------------------------------------
-- Annulations
-- ------------------------------------------------------------
select throws_ok($$ select public.annuler_reservation_keyli(current_setting('test.r1')::uuid) $$,
  '23514', 'Indiquez au voyageur le motif de l''annulation', 'L''hôte annule avec un motif obligatoire');
select lives_ok($$ select public.annuler_reservation_keyli(current_setting('test.r1')::uuid, 'Dégât des eaux') $$,
  'L''hôte annule une réservation acceptée');
select is((select motif from public.devis_sejour_keyli(
  current_setting('test.appart')::uuid, null, pg_temp.j(10), pg_temp.j(13), 2)),
  null, 'Après annulation, les nuits sont de nouveau libres');

select pg_temp.connecter('e5e00000-0000-0000-0000-000000000002');
select lives_ok($$ select public.annuler_reservation_keyli(current_setting('test.h1')::uuid) $$,
  'Le voyageur annule sa réservation');
select is((select count(*)::int from public.notifications_keyli where type = 'reservation_annulee'),
  1, 'Le voyageur est notifié de l''annulation par l''hôte');

select * from finish();
rollback;
