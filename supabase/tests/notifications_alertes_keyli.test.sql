-- Tests des notifications in-app et du déclenchement des alertes — exécutés
-- par `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(18);

-- ------------------------------------------------------------
-- P propriétaire (forfait Grande Agence : 30 annonces) ; C et D chercheurs
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('99999999-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}'),
  ('99999999-0000-0000-0000-00000000000c', 'c@test.local', '{}'),
  ('99999999-0000-0000-0000-00000000000d', 'd@test.local', '{}');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
  select '99999999-0000-0000-0000-000000000001', id, prix_mensuel, now() - interval '1 day', now() + interval '1 month'
    from public.plans_keyli where code = 'grande_agence';

select set_config('test.riviera', (select id::text from public.quartiers_keyli where nom = 'Riviera'), true);
select set_config('test.cocody',  (select id::text from public.communes_keyli where nom = 'Cocody'), true);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
-- Publie une annonce au nom du propriétaire P (écriture serveur)
create function pg_temp.publier(titre text, quartier text, prix numeric, lng float8, lat float8) returns void
language sql as $$
  insert into public.properties_keyli (owner_id, title, type, status, price, city, quartier_id, rooms, geolocation)
  values ('99999999-0000-0000-0000-000000000001', titre, 'appartement', 'a_louer', prix, 'Abidjan',
          (select id from public.quartiers_keyli where nom = quartier), 3,
          extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography);
$$;

set local role authenticated;

-- ------------------------------------------------------------
-- Validation des critères
-- ------------------------------------------------------------
select pg_temp.connecter('99999999-0000-0000-0000-00000000000c');  -- C
select throws_ok(
  $$ insert into public.search_alerts_keyli (user_id, criteres) values ('99999999-0000-0000-0000-00000000000c', '{"piscine": true}') $$,
  '23514', null, 'Une clé de critère inconnue est refusée');
select throws_ok(
  $$ insert into public.search_alerts_keyli (user_id, criteres) values ('99999999-0000-0000-0000-00000000000c', '{"type": "chateau"}') $$,
  '23514', null, 'Un type de bien inconnu est refusé');
select throws_ok(
  $$ insert into public.search_alerts_keyli (user_id, criteres) values ('99999999-0000-0000-0000-00000000000c', '{"rayon_km": 2}') $$,
  '23514', null, 'Un rayon sans point de référence est refusé');
select throws_ok(
  $$ insert into public.search_alerts_keyli (user_id, criteres) values ('99999999-0000-0000-0000-00000000000c', '{"prix_min": 500, "prix_max": 100}') $$,
  '23514', null, 'Un prix minimum supérieur au maximum est refusé');

-- Alertes de C : quartier Riviera + budget ; rayon de 2 km autour de la Riviera
select lives_ok(
  $$ insert into public.search_alerts_keyli (user_id, criteres) values
       ('99999999-0000-0000-0000-00000000000c',
        jsonb_build_object('quartier_id', current_setting('test.riviera'), 'status', 'a_louer', 'prix_max', 400000, 'rooms_min', 2)),
       ('99999999-0000-0000-0000-00000000000c',
        '{"lat": 5.3600, "lng": -3.9622, "rayon_km": 2}') $$,
  'Un chercheur enregistre une alerte par quartier et une alerte par rayon');

-- Alerte de D : commune de Cocody, désactivée ensuite
select pg_temp.connecter('99999999-0000-0000-0000-00000000000d');  -- D
insert into public.search_alerts_keyli (user_id, criteres)
  values ('99999999-0000-0000-0000-00000000000d', jsonb_build_object('commune_id', current_setting('test.cocody')));
update public.search_alerts_keyli set actif = false;

-- ------------------------------------------------------------
-- Publications
-- ------------------------------------------------------------
set local role postgres;
select pg_temp.publier('Appart Riviera', 'Riviera', 350000, -3.9622, 5.3600);  -- quartier + rayon
select pg_temp.publier('Appart cher Riviera', 'Riviera', 900000, -3.9622, 5.3600);  -- rayon seulement
select pg_temp.publier('Appart Plateau', 'Plateau Centre', 200000, -4.0167, 5.3200);  -- aucune
-- P lui-même a une alerte large : jamais notifié pour ses propres annonces
insert into public.search_alerts_keyli (user_id, criteres)
  values ('99999999-0000-0000-0000-000000000001', '{"status": "a_louer"}');
select pg_temp.publier('Studio Riviera P', 'Riviera', 100000, -3.9622, 5.3600);

set local role authenticated;
select pg_temp.connecter('99999999-0000-0000-0000-00000000000c');  -- C
select results_eq(
  $$ select count(*)::int from public.notifications_keyli n
      join public.search_alerts_keyli a on a.id = n.alert_id
     where a.criteres ? 'quartier_id' $$,
  $$ values (2) $$,
  'Alerte quartier : notifiée pour les annonces dans le budget (Appart Riviera, Studio Riviera P)'
);
select results_eq(
  $$ select count(*)::int from public.notifications_keyli n
      join public.search_alerts_keyli a on a.id = n.alert_id
     where a.criteres ? 'rayon_km' $$,
  $$ values (3) $$,
  'Alerte par rayon : notifiée pour les 3 annonces à moins de 2 km, pas pour le Plateau'
);
select results_eq(
  $$ select contenu from public.notifications_keyli where contenu like 'Appart Riviera%' limit 1 $$,
  $$ values ('Appart Riviera — 350 000 XOF'::text) $$,
  'La notification indique le titre et le prix'
);
select is(
  (select count(*)::int from public.search_alerts_keyli where derniere_notification_at is not null),
  2, 'La date de dernière notification des alertes est renseignée'
);

select pg_temp.connecter('99999999-0000-0000-0000-00000000000d');  -- D
select results_eq($$ select count(*)::int from public.notifications_keyli $$, $$ values (0) $$,
  'Une alerte désactivée ne notifie pas');

select pg_temp.connecter('99999999-0000-0000-0000-000000000001');  -- P
select results_eq($$ select count(*)::int from public.notifications_keyli $$, $$ values (0) $$,
  'Personne n''est notifié pour sa propre annonce');

-- ------------------------------------------------------------
-- Republication et plafond de 10 par alerte et par jour
-- ------------------------------------------------------------
set local role postgres;
update public.properties_keyli set archived_at = now() where title = 'Appart Plateau';
update public.properties_keyli set archived_at = null, quartier_id = current_setting('test.riviera')::uuid,
       geolocation = 'SRID=4326;POINT(-3.9622 5.3600)' where title = 'Appart Plateau';
select is(
  (select count(*)::int from public.notifications_keyli where contenu like 'Appart Plateau%'),
  2, 'Une republication correspondante déclenche les alertes'
);

select pg_temp.publier('Lot ' || g, 'Riviera', 300000, -3.9622, 5.3600) from generate_series(1, 10) g;
select is(
  (select count(*)::int from public.notifications_keyli n
     join public.search_alerts_keyli a on a.id = n.alert_id
    where a.criteres ? 'rayon_km'),
  10, 'Plafond : au plus 10 notifications par alerte et par jour'
);

-- ------------------------------------------------------------
-- Accès
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('99999999-0000-0000-0000-00000000000c');  -- C
select lives_ok($$ update public.notifications_keyli set lue = true $$, 'Le chercheur marque ses notifications lues');
select throws_ok(
  $$ insert into public.notifications_keyli (user_id, type, titre) values ('99999999-0000-0000-0000-00000000000c', 'alerte_recherche', 'Fausse') $$,
  '42501', null, 'Un utilisateur ne crée pas de notification');
select throws_ok(
  $$ update public.notifications_keyli set titre = 'Modifié' $$,
  '42501', null, 'Une notification ne se réécrit pas');

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok($$ select * from public.notifications_keyli $$, '42501', null,
  'Un visiteur anonyme ne lit aucune notification');

set local role postgres;
select is(
  (select count(*)::int from public.notifications_keyli where user_id = '99999999-0000-0000-0000-00000000000c' and not lue),
  0, 'Toutes les notifications du chercheur sont lues'
);

select * from finish();
rollback;
