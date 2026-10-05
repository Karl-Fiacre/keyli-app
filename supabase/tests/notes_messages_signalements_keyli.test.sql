-- Tests de messages_keyli / ratings_keyli / reports_keyli — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(27);

-- ------------------------------------------------------------
-- Comptes : P propriétaire (annonce « Villa »), C chercheur, D autre
-- chercheur, I intrus
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('22222222-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}'),
  ('22222222-0000-0000-0000-000000000002', 'c@test.local', '{}'),
  ('22222222-0000-0000-0000-000000000003', 'd@test.local', '{}'),
  ('22222222-0000-0000-0000-000000000004', 'i@test.local', '{}');

insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
  select '22222222-0000-0000-0000-000000000001', id, prix_mensuel, now() - interval '1 day', now() + interval '1 month'
    from public.plans_keyli where code = 'proprietaire';
insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
  values ('22222222-0000-0000-0000-000000000001', 'Villa', 'villa', 'a_louer', 300000, 'Abidjan', 'SRID=4326;POINT(-3.96 5.36)');
select set_config('test.villa', (select id::text from public.properties_keyli where title = 'Villa'), true);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ------------------------------------------------------------
-- Structure
-- ------------------------------------------------------------
select is(
  (select bool_and(relrowsecurity) from pg_class where oid in (
     'public.messages_keyli'::regclass, 'public.ratings_keyli'::regclass, 'public.reports_keyli'::regclass)),
  true,
  'RLS est activée sur les trois tables'
);

set local role authenticated;

-- ------------------------------------------------------------
-- Messagerie
-- ------------------------------------------------------------
select pg_temp.connecter('22222222-0000-0000-0000-000000000002');  -- C
select lives_ok(
  $$ insert into public.messages_keyli (from_user, to_user, property_id, body)
     values ('22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001',
             current_setting('test.villa')::uuid, 'Bonjour, la villa est-elle disponible ?') $$,
  'Un chercheur contacte le propriétaire d''une annonce (sans abonnement : aucun paywall)'
);
select throws_ok(
  $$ insert into public.messages_keyli (from_user, to_user, property_id, body)
     values ('22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003',
             current_setting('test.villa')::uuid, 'Démarchage') $$,
  '42501', null,
  'On ne démarche pas à froid un utilisateur qui n''est pas le propriétaire'
);
select throws_ok(
  $$ insert into public.messages_keyli (from_user, to_user, property_id, body)
     values ('22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003',
             current_setting('test.villa')::uuid, 'Usurpation') $$,
  '42501', null,
  'On n''écrit pas au nom d''un autre'
);
select throws_ok(
  $$ insert into public.messages_keyli (from_user, to_user, property_id, body)
     values ('22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001',
             current_setting('test.villa')::uuid, '   ') $$,
  '23514', null,
  'Un message vide est refusé'
);

select pg_temp.connecter('22222222-0000-0000-0000-000000000001');  -- P
select results_eq(
  $$ select count(*)::int from public.messages_keyli where to_user = (select auth.uid()) and not read $$,
  $$ values (1) $$,
  'Le propriétaire voit 1 message non lu'
);
select lives_ok(
  $$ update public.messages_keyli set read = true where to_user = (select auth.uid()) $$,
  'Le destinataire marque le message comme lu'
);
select lives_ok(
  $$ insert into public.messages_keyli (from_user, to_user, property_id, body)
     values ('22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
             current_setting('test.villa')::uuid, 'Oui, visite possible samedi.') $$,
  'Le propriétaire répond à celui qui l''a contacté'
);
select throws_ok(
  $$ insert into public.messages_keyli (from_user, to_user, property_id, body)
     values ('22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003',
             current_setting('test.villa')::uuid, 'Promo !') $$,
  '42501', null,
  'Le propriétaire ne démarche pas quelqu''un qui ne l''a jamais contacté'
);
select throws_ok(
  $$ update public.messages_keyli set body = 'Texte réécrit' where from_user = (select auth.uid()) $$,
  '42501', null,
  'Un message envoyé ne se modifie pas'
);
select throws_ok(
  $$ delete from public.messages_keyli where to_user = (select auth.uid()) $$,
  '42501', null,
  'Un message ne se supprime pas'
);

select pg_temp.connecter('22222222-0000-0000-0000-000000000002');  -- C
-- C essaie de marquer « non lu » le message reçu par P : invisible côté
-- droits d'écriture (il n'est pas destinataire), donc sans effet
update public.messages_keyli set read = false where to_user = '22222222-0000-0000-0000-000000000001';

select pg_temp.connecter('22222222-0000-0000-0000-000000000004');  -- I
select results_eq(
  $$ select count(*)::int from public.messages_keyli $$,
  $$ values (0) $$,
  'Un tiers ne lit pas la conversation des autres'
);

-- ------------------------------------------------------------
-- Notation (après visite effectuée — règle du 2026-10-05, voir
-- notation_apres_visite_keyli.test.sql pour le détail)
-- ------------------------------------------------------------
set local role postgres;
insert into public.visits_keyli (property_id, scheduled_by, visitor_user_id, scheduled_at, status)
  values (current_setting('test.villa')::uuid, '22222222-0000-0000-0000-000000000001',
          '22222222-0000-0000-0000-000000000002', now() - interval '1 day', 'effectuee');
set local role authenticated;
select pg_temp.connecter('22222222-0000-0000-0000-000000000002');  -- C
select lives_ok(
  $$ insert into public.ratings_keyli (property_id, rater_id, rated_user_id, rating, comment)
     values (current_setting('test.villa')::uuid, '22222222-0000-0000-0000-000000000002',
             '22222222-0000-0000-0000-000000000001', 4, 'Propriétaire réactif') $$,
  'Le chercheur note le propriétaire après un échange'
);
select throws_ok(
  $$ insert into public.ratings_keyli (property_id, rater_id, rated_user_id, rating)
     values (current_setting('test.villa')::uuid, '22222222-0000-0000-0000-000000000002',
             '22222222-0000-0000-0000-000000000001', 5) $$,
  '23505', null,
  'Une seule note par utilisateur et par bien'
);
select lives_ok(
  $$ update public.ratings_keyli set rating = 5 where rater_id = (select auth.uid()) $$,
  'L''auteur revoit sa note'
);
select throws_ok(
  $$ update public.ratings_keyli set rated_user_id = '22222222-0000-0000-0000-000000000003'
      where rater_id = (select auth.uid()) $$,
  '42501', null,
  'L''auteur ne change pas la personne notée'
);

select pg_temp.connecter('22222222-0000-0000-0000-000000000001');  -- P
select lives_ok(
  $$ insert into public.ratings_keyli (property_id, rater_id, rated_user_id, rating)
     values (current_setting('test.villa')::uuid, '22222222-0000-0000-0000-000000000001',
             '22222222-0000-0000-0000-000000000002', 3) $$,
  'Notation bidirectionnelle : le propriétaire note le chercheur'
);

select pg_temp.connecter('22222222-0000-0000-0000-000000000004');  -- I
select throws_ok(
  $$ insert into public.ratings_keyli (property_id, rater_id, rated_user_id, rating)
     values (current_setting('test.villa')::uuid, '22222222-0000-0000-0000-000000000004',
             '22222222-0000-0000-0000-000000000001', 1) $$,
  '42501', null,
  'Pas de note sans échange préalable (fausse note d''un inconnu)'
);

select pg_temp.connecter('22222222-0000-0000-0000-000000000003');  -- D
-- D a contacté P mais P n'a jamais répondu : échange à sens unique
insert into public.messages_keyli (from_user, to_user, property_id, body)
  values ('22222222-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001',
          current_setting('test.villa')::uuid, 'Toujours disponible ?');
select throws_ok(
  $$ insert into public.ratings_keyli (property_id, rater_id, rated_user_id, rating)
     values (current_setting('test.villa')::uuid, '22222222-0000-0000-0000-000000000003',
             '22222222-0000-0000-0000-000000000001', 1) $$,
  '42501', null,
  'Pas de note sur un échange à sens unique'
);

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select results_eq(
  $$ select count(*)::int from public.ratings_keyli $$,
  $$ values (2) $$,
  'Les notes sont publiques'
);
set local role authenticated;

-- ------------------------------------------------------------
-- Signalements
-- ------------------------------------------------------------
select pg_temp.connecter('22222222-0000-0000-0000-000000000004');  -- I
select lives_ok(
  $$ insert into public.reports_keyli (reporter_id, property_id, reason)
     values ('22222222-0000-0000-0000-000000000004', current_setting('test.villa')::uuid, 'Photos trompeuses') $$,
  'Un utilisateur signale une annonce'
);
select throws_ok(
  $$ insert into public.reports_keyli (reporter_id, property_id, reason)
     values ('22222222-0000-0000-0000-000000000004', current_setting('test.villa')::uuid, 'Encore') $$,
  '23505', null,
  'Un seul signalement en attente par personne et par annonce'
);
select throws_ok(
  $$ update public.reports_keyli set status = 'resolved' where reporter_id = (select auth.uid()) $$,
  '42501', null,
  'Le signaleur ne traite pas lui-même son signalement'
);

select pg_temp.connecter('22222222-0000-0000-0000-000000000001');  -- P
select results_eq(
  $$ select count(*)::int from public.reports_keyli $$,
  $$ values (0) $$,
  'Le propriétaire signalé ne voit pas qui l''a signalé'
);

-- ------------------------------------------------------------
-- Vérifications finales (serveur)
-- ------------------------------------------------------------
set local role postgres;
select is(
  (select rating_avg from public.profiles_keyli where user_id = '22222222-0000-0000-0000-000000000001'),
  5.00::numeric,
  'La note moyenne du propriétaire est recalculée par trigger (5 après révision)'
);
select is(
  (select rating_avg from public.profiles_keyli where user_id = '22222222-0000-0000-0000-000000000002'),
  3.00::numeric,
  'La note moyenne du chercheur est recalculée par trigger'
);
select is(
  (select read from public.messages_keyli
    where to_user = '22222222-0000-0000-0000-000000000001'
      and from_user = '22222222-0000-0000-0000-000000000002'),
  true,
  'Un tiers ne peut pas remettre « non lu » le message d''un autre'
);

select * from finish();
rollback;
