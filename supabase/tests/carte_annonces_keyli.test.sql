-- Tests de la carte du catalogue (migration 20261110120000_carte_annonces_keyli)
-- — exécutés par `npm run db:test` (pgTAP), en local, en CI et sur le
-- projet distant. Transaction annulée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('ca000000-0000-0000-0000-000000000001', 'p-carte@test.local', '{"role_keyli": "owner"}');

-- A et B publiées dans la même case, C archivée
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'ca000000-0000-0000-0000-000000000001', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';
insert into public.properties_keyli (id, owner_id, title, type, status, price, city, geolocation, archived_at) values
  ('ca000000-0000-0000-0000-0000000000a1', 'ca000000-0000-0000-0000-000000000001', 'Carte A', 'appartement', 'a_louer',
   100000, 'Abidjan', 'SRID=4326;POINT(-4.00510 5.35470)', null),
  ('ca000000-0000-0000-0000-0000000000b2', 'ca000000-0000-0000-0000-000000000001', 'Carte B', 'appartement', 'a_louer',
   100000, 'Abidjan', 'SRID=4326;POINT(-4.00490 5.35450)', null),
  ('ca000000-0000-0000-0000-0000000000c3', 'ca000000-0000-0000-0000-000000000001', 'Carte C', 'appartement', 'a_louer',
   100000, 'Abidjan', 'SRID=4326;POINT(-4.00500 5.35460)', now());

-- Résultats lus en visiteur, stockés pour être vérifiés en postgres
-- (les rôles anon ne voient pas pgTAP sur le projet distant)
set local role anon;
select set_config('test.nb', (select count(*)::text from public.positions_annonces_keyli(array[
  'ca000000-0000-0000-0000-0000000000a1', 'ca000000-0000-0000-0000-0000000000b2',
  'ca000000-0000-0000-0000-0000000000c3']::uuid[])), true);
select set_config('test.a', (select latitude || ',' || longitude from public.positions_annonces_keyli(
  array['ca000000-0000-0000-0000-0000000000a1']::uuid[])), true);
select set_config('test.a_bis', (select latitude || ',' || longitude from public.positions_annonces_keyli(
  array['ca000000-0000-0000-0000-0000000000a1']::uuid[])), true);
select set_config('test.b', (select latitude || ',' || longitude from public.positions_annonces_keyli(
  array['ca000000-0000-0000-0000-0000000000b2']::uuid[])), true);
select set_config('test.geo_anon', (select count(*)::text from (select 1) x
  where has_column_privilege('public.properties_keyli', 'geolocation', 'select')), true);
select set_config('test.titre_anon', (select count(*)::text from (select 1) x
  where has_column_privilege('public.properties_keyli', 'title', 'select')), true);
select set_config('test.fonction_interne', (select count(*)::text from (select 1) x
  where has_function_privilege('public.position_approchee_keyli(uuid, extensions.geography)', 'execute')), true);
reset role;
set local role postgres;

select is(current_setting('test.nb'), '2', 'Seules les annonces publiées ont une position (archivée exclue)');
select is(current_setting('test.a'), current_setting('test.a_bis'), 'Même position à chaque appel (pas de moyenne possible)');
select isnt(current_setting('test.a'), current_setting('test.b'), 'Deux biens d''une même case ne se superposent pas');
select ok(
  abs(split_part(current_setting('test.a'), ',', 1)::float8 - 5.35470) between 0.0001 and 0.004
  and abs(split_part(current_setting('test.a'), ',', 2)::float8 + 4.00510) < 0.004,
  'Position décalée, mais dans le voisinage (moins de 450 m environ)');
select is((select count(*)::int from public.positions_annonces_keyli(array[]::uuid[])), 0,
  'Aucun identifiant : aucune position');
select is(current_setting('test.geo_anon'), '0', 'Un visiteur ne lit plus la position exacte');
select is(current_setting('test.titre_anon'), '1', 'Un visiteur lit toujours les autres colonnes');
select is(current_setting('test.fonction_interne'), '0', 'La fonction d''arrondi n''est pas appelable depuis le client');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', 'ca000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select set_config('test.geo_auth', (select count(*)::text from (select 1) x
  where has_column_privilege('public.properties_keyli', 'geolocation', 'select')), true);
reset role;
set local role postgres;
select is(current_setting('test.geo_auth'), '0', 'Un compte connecté ne lit pas non plus la position exacte');

select * from finish();
rollback;
