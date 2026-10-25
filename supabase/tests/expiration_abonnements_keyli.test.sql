-- Tests de l'expiration des abonnements — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant (`--linked`).
-- Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(18);

-- ------------------------------------------------------------
-- Comptes (propriétaires) :
--   A  échéance dans 6 jours      → rappel J-7
--   B  échéance dans 12 heures    → rappel J-1
--   C  échéance passée (1 heure)  → expiration
--   D  échéance dans 20 jours     → rien
--   E  échéance passée, rôle changé depuis en « user » → expire quand même
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('eeee0000-0000-0000-0000-00000000000a', 'a@test.local', '{"role_keyli": "owner"}'),
  ('eeee0000-0000-0000-0000-00000000000b', 'b@test.local', '{"role_keyli": "owner"}'),
  ('eeee0000-0000-0000-0000-00000000000c', 'c@test.local', '{"role_keyli": "owner"}'),
  ('eeee0000-0000-0000-0000-00000000000d', 'd@test.local', '{"role_keyli": "owner"}'),
  ('eeee0000-0000-0000-0000-00000000000e', 'e@test.local', '{"role_keyli": "owner"}');

-- Abonnements d'abord en cours (la publication l'exige), échéances posées ensuite
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select u.id, p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '20 days'
  from unnest(array['eeee0000-0000-0000-0000-00000000000a', 'eeee0000-0000-0000-0000-00000000000b',
                    'eeee0000-0000-0000-0000-00000000000c', 'eeee0000-0000-0000-0000-00000000000d',
                    'eeee0000-0000-0000-0000-00000000000e']::uuid[]) as u(id)
  join public.plans_keyli p on p.code = 'proprietaire';

insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
select u.id, 'Annonce ' || u.id, 'appartement', 'a_louer', 100000, 'Abidjan', 'SRID=4326;POINT(-4.0 5.3)'
  from unnest(array['eeee0000-0000-0000-0000-00000000000a', 'eeee0000-0000-0000-0000-00000000000c']::uuid[]) as u(id);

update public.subscriptions_keyli set end_date = now() + interval '6 days'
 where user_id = 'eeee0000-0000-0000-0000-00000000000a';
update public.subscriptions_keyli set end_date = now() + interval '12 hours'
 where user_id = 'eeee0000-0000-0000-0000-00000000000b';
update public.subscriptions_keyli set start_date = now() - interval '1 month', end_date = now() - interval '1 hour'
 where user_id in ('eeee0000-0000-0000-0000-00000000000c', 'eeee0000-0000-0000-0000-00000000000e');
update public.profiles_keyli set role_keyli = 'user'
 where user_id = 'eeee0000-0000-0000-0000-00000000000e';

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ------------------------------------------------------------
-- Masquage : immédiat à l'échéance, avant même la tâche planifiée
-- ------------------------------------------------------------
set local role anon;
select is((select count(*)::int from public.properties_keyli where owner_id = 'eeee0000-0000-0000-0000-00000000000a'),
  1, 'Abonnement en cours : l''annonce est visible du public');
select is((select count(*)::int from public.properties_keyli where owner_id = 'eeee0000-0000-0000-0000-00000000000c'),
  0, 'Échéance passée : l''annonce est masquée dès la date de fin, sans délai de grâce');

set local role authenticated;
select pg_temp.connecter('eeee0000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.properties_keyli where owner_id = 'eeee0000-0000-0000-0000-00000000000c'),
  1, 'Le propriétaire voit toujours son annonce masquée');
select throws_ok($$ select * from public.traiter_echeances_abonnements_keyli() $$,
  '42501', null, 'Un utilisateur ne peut pas lancer la tâche d''échéances');

-- ------------------------------------------------------------
-- Tâche horaire
-- ------------------------------------------------------------
set local role postgres;
select results_eq($$ select * from public.traiter_echeances_abonnements_keyli() $$,
  $$ values (1, 1, 2) $$,
  'Premier passage : un rappel J-7 (A), un rappel J-1 (B), deux expirations (C, E)');

select is((select status::text from public.subscriptions_keyli where user_id = 'eeee0000-0000-0000-0000-00000000000c'),
  'expired', 'L''abonnement échu passe à « expired »');
select is((select status::text from public.subscriptions_keyli where user_id = 'eeee0000-0000-0000-0000-00000000000e'),
  'expired', 'L''expiration passe même si le rôle du compte a changé depuis la souscription');
select results_eq(
  $$ select type, titre from public.notifications_keyli where user_id = 'eeee0000-0000-0000-0000-00000000000c' $$,
  $$ values ('abonnement_expire'::text, 'Votre abonnement a expiré'::text) $$,
  'Notification d''expiration envoyée');
select results_eq(
  $$ select titre from public.notifications_keyli where user_id = 'eeee0000-0000-0000-0000-00000000000b' $$,
  $$ values ('Votre abonnement expire demain'::text) $$,
  'J-1 : un seul rappel, celui de la veille');
select results_eq(
  $$ select titre from public.notifications_keyli where user_id = 'eeee0000-0000-0000-0000-00000000000a' $$,
  $$ values ('Votre abonnement expire dans 7 jours'::text) $$,
  'J-7 : rappel une semaine avant');
select is((select count(*)::int from public.notifications_keyli where user_id = 'eeee0000-0000-0000-0000-00000000000d'),
  0, 'Échéance lointaine : aucune notification');
select is((select status::text from public.subscriptions_keyli where user_id = 'eeee0000-0000-0000-0000-00000000000a'),
  'active', 'Un rappel ne change pas l''état de l''abonnement');

select results_eq($$ select * from public.traiter_echeances_abonnements_keyli() $$,
  $$ values (0, 0, 0) $$,
  'Second passage : rien n''est envoyé deux fois');

-- A passe sous J-1 : le rappel de la veille part, une seule fois
update public.subscriptions_keyli set end_date = now() + interval '20 hours'
 where user_id = 'eeee0000-0000-0000-0000-00000000000a';
select results_eq($$ select * from public.traiter_echeances_abonnements_keyli() $$,
  $$ values (0, 1, 0) $$,
  'Après le rappel J-7, le rappel J-1 part à son tour');

-- Renouvellement : l'échéance se déplace, les rappels sont réarmés
update public.subscriptions_keyli set end_date = end_date + interval '5 days'
 where user_id = 'eeee0000-0000-0000-0000-00000000000a';
select results_eq($$ select * from public.traiter_echeances_abonnements_keyli() $$,
  $$ values (1, 0, 0) $$,
  'Une nouvelle échéance réarme le rappel J-7');

-- ------------------------------------------------------------
-- Renouvellement après expiration : les annonces réapparaissent
-- ------------------------------------------------------------
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'eeee0000-0000-0000-0000-00000000000c', p.id, p.prix_mensuel, now(), now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';
select is((select count(*)::int from public.subscriptions_keyli where user_id = 'eeee0000-0000-0000-0000-00000000000c'),
  2, 'Un nouvel abonnement s''ajoute à côté de l''ancien, expiré');

set local role anon;
select is((select count(*)::int from public.properties_keyli where owner_id = 'eeee0000-0000-0000-0000-00000000000c'),
  1, 'Renouvellement : l''annonce masquée redevient visible, sans republication');

set local role postgres;
select ok(exists (select 1 from cron.job where jobname = 'keyli-echeances-abonnements' and schedule = '5 * * * *'),
  'La tâche est planifiée toutes les heures');

select * from finish();
rollback;
