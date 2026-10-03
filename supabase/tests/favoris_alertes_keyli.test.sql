-- Tests de favorites_keyli / search_alerts_keyli — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(16);

-- ------------------------------------------------------------
-- Comptes : P propriétaire (une annonce publiée, une archivée),
-- C et D chercheurs
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('55555555-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}'),
  ('55555555-0000-0000-0000-000000000002', 'c@test.local', '{}'),
  ('55555555-0000-0000-0000-000000000003', 'd@test.local', '{}');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
  select '55555555-0000-0000-0000-000000000001', id, prix_mensuel, now() - interval '1 day', now() + interval '1 month'
    from public.plans_keyli where code = 'proprietaire';
insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation) values
  ('55555555-0000-0000-0000-000000000001', 'Studio publié', 'studio', 'a_louer', 1, 'Abidjan', 'SRID=4326;POINT(-4 5.3)'),
  ('55555555-0000-0000-0000-000000000001', 'Villa archivée', 'villa', 'a_louer', 1, 'Abidjan', 'SRID=4326;POINT(-4 5.31)');
update public.properties_keyli set archived_at = now() where title = 'Villa archivée';

select set_config('test.studio', (select id::text from public.properties_keyli where title = 'Studio publié'), true);
select set_config('test.villa',  (select id::text from public.properties_keyli where title = 'Villa archivée'), true);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select is(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.favorites_keyli'::regclass, 'public.search_alerts_keyli'::regclass)),
  true,
  'RLS est activée sur les deux tables'
);

set local role authenticated;

-- ------------------------------------------------------------
-- Favoris (chercheur C)
-- ------------------------------------------------------------
select pg_temp.connecter('55555555-0000-0000-0000-000000000002');
select lives_ok(
  $$ insert into public.favorites_keyli (user_id, property_id)
     values ('55555555-0000-0000-0000-000000000002', current_setting('test.studio')::uuid) $$,
  'Un chercheur ajoute une annonce à ses favoris'
);
select throws_ok(
  $$ insert into public.favorites_keyli (user_id, property_id)
     values ('55555555-0000-0000-0000-000000000002', current_setting('test.studio')::uuid) $$,
  '23505', null,
  'Une annonce n''est en favori qu''une fois'
);
select throws_ok(
  $$ insert into public.favorites_keyli (user_id, property_id)
     values ('55555555-0000-0000-0000-000000000002', current_setting('test.villa')::uuid) $$,
  '42501', null,
  'Pas de favori sur une annonce archivée (invisible)'
);
select throws_ok(
  $$ insert into public.favorites_keyli (user_id, property_id)
     values ('55555555-0000-0000-0000-000000000003', current_setting('test.studio')::uuid) $$,
  '42501', null,
  'On n''ajoute pas de favori au nom d''un autre'
);

select pg_temp.connecter('55555555-0000-0000-0000-000000000003');  -- D
select results_eq($$ select count(*)::int from public.favorites_keyli $$, $$ values (0) $$,
  'Les favoris d''un utilisateur sont privés');
delete from public.favorites_keyli;  -- tentative sur les favoris de C : invisible, sans effet

select pg_temp.connecter('55555555-0000-0000-0000-000000000002');  -- C
select results_eq($$ select count(*)::int from public.favorites_keyli $$, $$ values (1) $$,
  'Un autre utilisateur n''a pas pu retirer le favori');
select lives_ok($$ delete from public.favorites_keyli where property_id = current_setting('test.studio')::uuid $$,
  'Second clic : le favori est retiré');
select results_eq($$ select count(*)::int from public.favorites_keyli $$, $$ values (0) $$,
  'Le favori a bien disparu');

-- ------------------------------------------------------------
-- Alertes de recherche (chercheur C)
-- ------------------------------------------------------------
select lives_ok(
  $$ insert into public.search_alerts_keyli (user_id, criteres)
     values ('55555555-0000-0000-0000-000000000002',
             jsonb_build_object('quartier_id', (select id from public.quartiers_keyli where nom = 'Riviera'),
                                'type', 'appartement', 'prix_max', 300000)) $$,
  'Un chercheur enregistre une alerte'
);
select throws_ok(
  $$ insert into public.search_alerts_keyli (user_id, criteres) values ('55555555-0000-0000-0000-000000000002', '{}') $$,
  '23514', null,
  'Une alerte sans critère est refusée'
);
select lives_ok($$ update public.search_alerts_keyli set actif = false $$,
  'L''alerte se désactive');
select lives_ok($$ update public.search_alerts_keyli set actif = true, criteres = criteres || '{"rooms": 3}' $$,
  'L''alerte se réactive et ses critères évoluent');
select throws_ok($$ update public.search_alerts_keyli set derniere_notification_at = now() $$,
  '42501', null, 'La date de notification est réservée au serveur');
select throws_ok($$ delete from public.search_alerts_keyli $$,
  '42501', null, 'Une alerte ne se supprime pas (historique conservé)');

select pg_temp.connecter('55555555-0000-0000-0000-000000000003');  -- D
select results_eq($$ select count(*)::int from public.search_alerts_keyli $$, $$ values (0) $$,
  'Les alertes d''un utilisateur sont privées');

set local role postgres;
select * from finish();
rollback;
