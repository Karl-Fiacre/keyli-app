-- Tests de la mesure de conversion, des statistiques annonceur et des
-- annonces similaires (migration 20261115120000_conversion_annonces_keyli)
-- — exécutés par `npm run db:test` (pgTAP), en local, en CI et sur le projet
-- distant. Transaction annulée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(13);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- P propriétaire (forfait actif), Q propriétaire (forfait échu ensuite), C1 et C2
-- chercheurs, X admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('d8000000-0000-0000-0000-000000000001', 'p-conv@test.local', '{"role_keyli": "owner"}'),
  ('d8000000-0000-0000-0000-000000000002', 'q-conv@test.local', '{"role_keyli": "owner"}'),
  ('d8000000-0000-0000-0000-000000000003', 'c1-conv@test.local', '{"role_keyli": "user"}'),
  ('d8000000-0000-0000-0000-000000000004', 'c2-conv@test.local', '{"role_keyli": "user"}'),
  ('d8000000-0000-0000-0000-000000000005', 'x-conv@test.local', '{"role_keyli": "user"}');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'd8000000-0000-0000-0000-000000000005';
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select u.id, p.id, p.prix_mensuel, now() - interval '2 days', now() + interval '1 month'
  from unnest(array['d8000000-0000-0000-0000-000000000001', 'd8000000-0000-0000-0000-000000000002']::uuid[]) as u(id)
  join public.plans_keyli p on p.code = 'proprietaire';

-- A villa Riviera (référence), B villa Angré, C appartement Riviera,
-- D villa à vendre, E villa Riviera de Q (invisible : pas de forfait)
insert into public.properties_keyli
  (owner_id, title, type, status, price, city, quartier_id, geolocation, area_m2, description) values
  ('d8000000-0000-0000-0000-000000000001', 'A conv', 'villa', 'a_louer', 500000, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Riviera'), 'SRID=4326;POINT(-3.96 5.36)', 250, 'Belle villa'),
  ('d8000000-0000-0000-0000-000000000001', 'B conv', 'villa', 'a_louer', 550000, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Angré'), 'SRID=4326;POINT(-3.97 5.37)', null, null),
  ('d8000000-0000-0000-0000-000000000001', 'C conv', 'appartement', 'a_louer', 300000, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Riviera'), 'SRID=4326;POINT(-3.96 5.36)', null, '  '),
  ('d8000000-0000-0000-0000-000000000001', 'D conv', 'villa', 'a_vendre', 90000000, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Riviera'), 'SRID=4326;POINT(-3.96 5.36)', null, null),
  ('d8000000-0000-0000-0000-000000000002', 'E conv', 'villa', 'a_louer', 500000, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Riviera'), 'SRID=4326;POINT(-3.96 5.36)', null, null);

-- Le forfait de Q arrive à échéance : son annonce E n'est plus visible
update public.subscriptions_keyli set end_date = now() - interval '1 hour'
 where user_id = 'd8000000-0000-0000-0000-000000000002';

create function pg_temp.bien(t text) returns uuid language sql as $$
  select id from public.properties_keyli where title = t;
$$;

-- Vues : s1 (deux fois) et s2 sur A, s3 sur C ; intention de s1 sur A
insert into public.property_interactions_keyli (property_id, session_id, interaction_type, source) values
  (pg_temp.bien('A conv'), 'session-conv-1', 'view', 'search'),
  (pg_temp.bien('A conv'), 'session-conv-1', 'view', 'search'),
  (pg_temp.bien('A conv'), 'session-conv-2', 'view', 'map'),
  (pg_temp.bien('C conv'), 'session-conv-3', 'view', 'search'),
  (pg_temp.bien('A conv'), 'session-conv-1', 'click_contact', 'search');

-- Messages : C1 écrit deux fois sur A (un contact), P lui répond (exclu),
-- C2 écrit sur C ; C1 avait déjà écrit sur B il y a 60 jours (pas un
-- nouveau contact sur la période)
insert into public.messages_keyli (from_user, to_user, property_id, body, created_at) values
  ('d8000000-0000-0000-0000-000000000003', 'd8000000-0000-0000-0000-000000000001', pg_temp.bien('A conv'), 'Bonjour', now()),
  ('d8000000-0000-0000-0000-000000000003', 'd8000000-0000-0000-0000-000000000001', pg_temp.bien('A conv'), 'Relance', now()),
  ('d8000000-0000-0000-0000-000000000001', 'd8000000-0000-0000-0000-000000000003', pg_temp.bien('A conv'), 'Réponse', now()),
  ('d8000000-0000-0000-0000-000000000004', 'd8000000-0000-0000-0000-000000000001', pg_temp.bien('C conv'), 'Dispo ?', now()),
  ('d8000000-0000-0000-0000-000000000003', 'd8000000-0000-0000-0000-000000000001', pg_temp.bien('B conv'), 'Ancien', now() - interval '60 days'),
  ('d8000000-0000-0000-0000-000000000003', 'd8000000-0000-0000-0000-000000000001', pg_temp.bien('B conv'), 'Encore', now());

-- ------------------------------------------------------------
-- Mesure de la conversion (admin)
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('d8000000-0000-0000-0000-000000000003');
select throws_ok(
  $$ select * from public.conversion_annonces_keyli(current_date - 29, current_date) $$,
  '42501', null, 'Un non-admin ne lit pas la conversion');

select pg_temp.connecter('d8000000-0000-0000-0000-000000000005');
select throws_ok(
  $$ select * from public.conversion_annonces_keyli(current_date, current_date - 1) $$,
  '22023', null, 'Période inversée refusée');

reset role;
set local role postgres;
-- Les données de démonstration peuvent compter dans la période : on ne
-- garde, le temps du test (transaction annulée), que les nôtres
delete from public.property_interactions_keyli
 where property_id not in (select id from public.properties_keyli where title like '% conv');
delete from public.messages_keyli
 where property_id is null or property_id not in (select id from public.properties_keyli where title like '% conv');

set local role authenticated;
select pg_temp.connecter('d8000000-0000-0000-0000-000000000005');
select is(
  (select format('%s|%s|%s', visiteurs, intentions, contacts)
     from public.conversion_annonces_keyli(current_date - 29, current_date) where dimension = 'total'),
  '3|1|2',
  'Total : 3 visiteurs (s1 compté une fois), 1 intention, 2 contacts (relance, réponse et ancien contact exclus)');
select is(
  (select string_agg(format('%s=%s|%s|%s', cle, visiteurs, intentions, contacts), ',' order by cle)
     from public.conversion_annonces_keyli(current_date - 29, current_date) where dimension = 'type'),
  'appartement=1|0|1,villa=2|1|1',
  'Répartition par type de bien');
select is(
  (select format('%s|%s', visiteurs, contacts)
     from public.conversion_annonces_keyli(current_date - 29, current_date)
    where dimension = 'commune'
      and cle = (select c.nom from public.communes_keyli c join public.quartiers_keyli q on q.commune_id = c.id
                  where q.nom = 'Riviera')),
  '3|2',
  'Répartition par commune (Riviera)');
select is(
  (select format('%s|%s', visiteurs, contacts)
     from public.conversion_annonces_keyli(current_date - 100, current_date - 50) where dimension = 'total'),
  '0|1',
  'Période ancienne : le premier message sur B compte à sa date');

-- ------------------------------------------------------------
-- Statistiques et qualité par annonce (annonceur)
-- ------------------------------------------------------------
select pg_temp.connecter('d8000000-0000-0000-0000-000000000001');
select is(
  (select string_agg(titre, ',' order by titre) from public.performance_mes_annonces_keyli(30)),
  'A conv,B conv,C conv,D conv',
  'L''annonceur voit ses 4 annonces, pas celles des autres');
select is(
  (select format('%s|%s|%s', visiteurs, intentions, contacts) from public.performance_mes_annonces_keyli(30)
    where titre = 'A conv'),
  '2|1|1', 'A : 2 visiteurs, 1 intention, 1 contact');
select is(
  (select format('%s|%s', visiteurs, contacts) from public.performance_mes_annonces_keyli(30) where titre = 'B conv'),
  '0|0', 'B : le chercheur qui avait déjà écrit il y a 60 jours n''est pas un nouveau contact');
select is(
  (select format('%s|%s|%s|%s|%s|%s', nb_photos, a_description, a_quartier, a_surface, a_position, annonceur_verifie)
     from public.performance_mes_annonces_keyli(30) where titre = 'A conv'),
  '0|t|t|t|t|f', 'Critères de qualité de A');
select is(
  (select a_description from public.performance_mes_annonces_keyli(30) where titre = 'C conv'),
  false, 'Une description faite d''espaces compte comme absente');

-- ------------------------------------------------------------
-- Annonces similaires (visiteur)
-- ------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select is(
  (select string_agg(titre, ',') from public.annonces_similaires_keyli(pg_temp.bien('A conv'), 4)),
  'C conv,B conv',
  'Similaires de A : même quartier d''abord ; ni A, ni la vente, ni l''annonce invisible de Q');
select is(
  (select count(*)::int from public.annonces_similaires_keyli(pg_temp.bien('E conv'), 4)),
  0, 'Annonce de référence invisible : aucune suggestion');

select * from finish();
rollback;
