-- Tests de la règle de notation « après visite effectuée ou lead conclu » —
-- exécutés par `npm run db:test` (pgTAP), en local, en CI et sur le projet
-- distant (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(11);

-- ------------------------------------------------------------
-- P propriétaire ; C, D, E chercheurs ayant tous échangé des messages avec P
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('88888888-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}'),
  ('88888888-0000-0000-0000-00000000000c', 'c@test.local', '{}'),
  ('88888888-0000-0000-0000-00000000000d', 'd@test.local', '{}'),
  ('88888888-0000-0000-0000-00000000000e', 'e@test.local', '{}');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
  select '88888888-0000-0000-0000-000000000001', id, prix_mensuel, now() - interval '1 day', now() + interval '1 month'
    from public.plans_keyli where code = 'proprietaire';
insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
  values ('88888888-0000-0000-0000-000000000001', 'Maison', 'maison', 'a_louer', 1, 'Abidjan', 'SRID=4326;POINT(-4 5.3)');
select set_config('test.maison', (select id::text from public.properties_keyli where title = 'Maison'), true);

-- Échanges dans les deux sens (créent aussi les leads « nouveau »)
insert into public.messages_keyli (from_user, to_user, property_id, body)
select c, '88888888-0000-0000-0000-000000000001', current_setting('test.maison')::uuid, 'Bonjour'
  from unnest(array['88888888-0000-0000-0000-00000000000c', '88888888-0000-0000-0000-00000000000d',
                    '88888888-0000-0000-0000-00000000000e']::uuid[]) as c;
insert into public.messages_keyli (from_user, to_user, property_id, body)
select '88888888-0000-0000-0000-000000000001', c, current_setting('test.maison')::uuid, 'Bonjour à vous'
  from unnest(array['88888888-0000-0000-0000-00000000000c', '88888888-0000-0000-0000-00000000000d',
                    '88888888-0000-0000-0000-00000000000e']::uuid[]) as c;

-- C : visite planifiée (pas encore effectuée) ; E : visite annulée
insert into public.visits_keyli (property_id, scheduled_by, visitor_user_id, scheduled_at, status) values
  (current_setting('test.maison')::uuid, '88888888-0000-0000-0000-000000000001', '88888888-0000-0000-0000-00000000000c', now(), 'planifiee'),
  (current_setting('test.maison')::uuid, '88888888-0000-0000-0000-000000000001', '88888888-0000-0000-0000-00000000000e', now(), 'annulee');
-- D : lead conclu (location signée)
update public.leads_keyli set stage = 'conclu' where contact_user_id = '88888888-0000-0000-0000-00000000000d';

create function pg_temp.noter(auteur text, cible text, note integer) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', auteur, 'role', 'authenticated')::text, true);
  insert into public.ratings_keyli (property_id, rater_id, rated_user_id, rating)
  values (current_setting('test.maison')::uuid, auteur::uuid, cible::uuid, note);
$$;

set local role authenticated;

select throws_ok(
  $$ select pg_temp.noter('88888888-0000-0000-0000-00000000000c', '88888888-0000-0000-0000-000000000001', 5) $$,
  '42501', null,
  'Un simple échange de messages ne suffit plus pour noter'
);
select throws_ok(
  $$ select pg_temp.noter('88888888-0000-0000-0000-00000000000e', '88888888-0000-0000-0000-000000000001', 1) $$,
  '42501', null,
  'Une visite annulée ne permet pas de noter'
);

set local role postgres;
update public.visits_keyli set status = 'effectuee' where visitor_user_id = '88888888-0000-0000-0000-00000000000c';
set local role authenticated;

select lives_ok(
  $$ select pg_temp.noter('88888888-0000-0000-0000-00000000000c', '88888888-0000-0000-0000-000000000001', 4) $$,
  'Après une visite effectuée, le chercheur note le propriétaire'
);
select lives_ok(
  $$ select pg_temp.noter('88888888-0000-0000-0000-000000000001', '88888888-0000-0000-0000-00000000000c', 5) $$,
  'Après une visite effectuée, le propriétaire note le chercheur'
);
select lives_ok(
  $$ select pg_temp.noter('88888888-0000-0000-0000-00000000000d', '88888888-0000-0000-0000-000000000001', 3) $$,
  'Après un lead conclu, le locataire note le propriétaire'
);
select lives_ok(
  $$ select pg_temp.noter('88888888-0000-0000-0000-000000000001', '88888888-0000-0000-0000-00000000000d', 4) $$,
  'Le propriétaire note un second locataire du même bien'
);
select throws_ok(
  $$ select pg_temp.noter('88888888-0000-0000-0000-000000000001', '88888888-0000-0000-0000-00000000000d', 1) $$,
  '23505', null,
  'Mais une seule fois par personne notée'
);
select throws_ok(
  $$ select pg_temp.noter('88888888-0000-0000-0000-00000000000c', '88888888-0000-0000-0000-00000000000d', 1) $$,
  '42501', null,
  'On ne note pas quelqu''un avec qui on n''a eu ni visite ni transaction'
);

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok(
  $$ select public.relation_notable_keyli(current_setting('test.maison')::uuid, '88888888-0000-0000-0000-000000000001') $$,
  '42501', null,
  'Un visiteur anonyme ne peut pas interroger les relations notables'
);

set local role postgres;
select is(
  (select rating_avg from public.profiles_keyli where user_id = '88888888-0000-0000-0000-000000000001'),
  3.50::numeric,
  'La note moyenne du propriétaire reste recalculée (4 et 3)'
);
select is(
  (select count(*)::int from public.ratings_keyli where rater_id = '88888888-0000-0000-0000-000000000001'),
  2,
  'Le propriétaire a bien noté ses deux locataires'
);

select * from finish();
rollback;
