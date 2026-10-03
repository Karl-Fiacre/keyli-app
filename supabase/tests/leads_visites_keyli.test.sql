-- Tests de leads_keyli / visits_keyli — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant (`--linked`).
-- Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(23);

-- ------------------------------------------------------------
-- Comptes : A agence (agent Mariam), B autre agence (agent Yao),
-- C et D chercheurs
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('44444444-0000-0000-0000-00000000000a', 'a@test.local', '{"role_keyli": "agency"}'),
  ('44444444-0000-0000-0000-00000000000b', 'b@test.local', '{"role_keyli": "agency"}'),
  ('44444444-0000-0000-0000-00000000000c', 'c@test.local', '{}'),
  ('44444444-0000-0000-0000-00000000000d', 'd@test.local', '{}');

insert into public.documents_keyli (user_id, doc_type, file_url, status)
select id, 'registre', id::text || '/registre.pdf', 'approved'
  from unnest(array['44444444-0000-0000-0000-00000000000a', '44444444-0000-0000-0000-00000000000b']::uuid[]) as id;
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select u.id, p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from unnest(array['44444444-0000-0000-0000-00000000000a', '44444444-0000-0000-0000-00000000000b']::uuid[]) as u(id)
  join public.plans_keyli p on p.code = 'agence_moyenne';
insert into public.agency_agents_keyli (agency_user_id, nom) values
  ('44444444-0000-0000-0000-00000000000a', 'Mariam'),
  ('44444444-0000-0000-0000-00000000000b', 'Yao');
insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation) values
  ('44444444-0000-0000-0000-00000000000a', 'Appart A', 'appartement', 'a_louer', 1, 'Abidjan', 'SRID=4326;POINT(-3.99 5.35)'),
  ('44444444-0000-0000-0000-00000000000b', 'Duplex B', 'duplex', 'a_vendre', 1, 'Abidjan', 'SRID=4326;POINT(-3.98 5.34)');

select set_config('test.appart_a', (select id::text from public.properties_keyli where title = 'Appart A'), true);
select set_config('test.duplex_b', (select id::text from public.properties_keyli where title = 'Duplex B'), true);
select set_config('test.agent_a',  (select id::text from public.agency_agents_keyli where nom = 'Mariam'), true);
select set_config('test.agent_b',  (select id::text from public.agency_agents_keyli where nom = 'Yao'), true);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select is(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.leads_keyli'::regclass, 'public.visits_keyli'::regclass)),
  true,
  'RLS est activée sur leads_keyli et visits_keyli'
);

set local role authenticated;

-- ------------------------------------------------------------
-- Lead créé automatiquement au premier contact
-- ------------------------------------------------------------
select pg_temp.connecter('44444444-0000-0000-0000-00000000000c');  -- C
insert into public.messages_keyli (from_user, to_user, property_id, body) values
  ('44444444-0000-0000-0000-00000000000c', '44444444-0000-0000-0000-00000000000a',
   current_setting('test.appart_a')::uuid, 'Bonjour, visite possible ?'),
  ('44444444-0000-0000-0000-00000000000c', '44444444-0000-0000-0000-00000000000a',
   current_setting('test.appart_a')::uuid, 'Je relance.');

select pg_temp.connecter('44444444-0000-0000-0000-00000000000a');  -- A
select results_eq(
  $$ select stage::text, contact_user_id::text, owner_id::text from public.leads_keyli $$,
  $$ values ('nouveau', '44444444-0000-0000-0000-00000000000c', '44444444-0000-0000-0000-00000000000a') $$,
  'Un premier contact crée un lead « nouveau » chez le propriétaire de l''annonce'
);
select results_eq($$ select count(*)::int from public.leads_keyli $$, $$ values (1) $$,
  'Un second message du même chercheur ne crée pas de doublon');

-- Le propriétaire répond : pas de lead pour sa propre réponse
insert into public.messages_keyli (from_user, to_user, property_id, body) values
  ('44444444-0000-0000-0000-00000000000a', '44444444-0000-0000-0000-00000000000c',
   current_setting('test.appart_a')::uuid, 'Oui, samedi.');
select results_eq($$ select count(*)::int from public.leads_keyli $$, $$ values (1) $$,
  'La réponse du propriétaire ne crée pas de lead');

-- ------------------------------------------------------------
-- Pipeline (agence A)
-- ------------------------------------------------------------
select lives_ok(
  $$ update public.leads_keyli set stage = 'negociation', agent_id = current_setting('test.agent_a')::uuid $$,
  'L''agence fait avancer le lead et l''assigne à son agent'
);
select throws_ok(
  $$ update public.leads_keyli set agent_id = current_setting('test.agent_b')::uuid $$,
  '23514', null,
  'Un lead ne s''assigne pas à l''agent d''une autre agence'
);
select lives_ok(
  $$ insert into public.leads_keyli (property_id, contact_nom)
     values (current_setting('test.appart_a')::uuid, 'Contact WhatsApp — M. Kouassi') $$,
  'L''agence crée un lead pour un contact hors plateforme'
);
select throws_ok(
  $$ insert into public.leads_keyli (property_id, contact_nom) values (current_setting('test.appart_a')::uuid, '  ') $$,
  '23514', null,
  'Un lead sans contact identifié est refusé'
);
select throws_ok(
  $$ insert into public.leads_keyli (property_id, contact_nom) values (current_setting('test.duplex_b')::uuid, 'Vol de bien') $$,
  '42501', null,
  'On ne crée pas de lead sur l''annonce d''un autre'
);
select throws_ok(
  $$ insert into public.leads_keyli (property_id, contact_user_id)
     values (current_setting('test.appart_a')::uuid, '44444444-0000-0000-0000-00000000000d') $$,
  '42501', null,
  'Un lead manuel ne rattache pas un compte Keyli arbitraire'
);
select throws_ok(
  $$ update public.leads_keyli set owner_id = '44444444-0000-0000-0000-00000000000b' $$,
  '42501', null,
  'Le propriétaire d''un lead ne se modifie pas'
);
select throws_ok($$ delete from public.leads_keyli $$, '42501', null, 'Un lead ne se supprime pas');
select results_eq(
  $$ select count(*)::int from public.leads_keyli where stage <> 'conclu' $$,
  $$ values (2) $$,
  'KPI « Leads actifs » : leads hors stade conclu'
);

-- ------------------------------------------------------------
-- Visites (agence A)
-- ------------------------------------------------------------
select lives_ok(
  $$ insert into public.visits_keyli (lead_id, property_id, scheduled_by, visitor_user_id, scheduled_at)
     select l.id, l.property_id, '44444444-0000-0000-0000-00000000000a', l.contact_user_id, now() + interval '2 days'
       from public.leads_keyli l where l.contact_user_id is not null $$,
  'L''agence planifie une visite avec le chercheur qui l''a contactée'
);
select lives_ok(
  $$ insert into public.visits_keyli (property_id, scheduled_by, visitor_nom, scheduled_at)
     values (current_setting('test.appart_a')::uuid, '44444444-0000-0000-0000-00000000000a', 'M. Kouassi', now() + interval '3 days') $$,
  'L''agence planifie une visite hors pipeline pour un contact externe'
);
select throws_ok(
  $$ insert into public.visits_keyli (property_id, scheduled_by, visitor_user_id, scheduled_at)
     values (current_setting('test.appart_a')::uuid, '44444444-0000-0000-0000-00000000000a',
             '44444444-0000-0000-0000-00000000000d', now() + interval '1 day') $$,
  '42501', null,
  'Pas de visite au nom d''un compte qui n''a jamais écrit sur le bien'
);
select throws_ok(
  $$ insert into public.visits_keyli (property_id, scheduled_by, visitor_nom, scheduled_at)
     values (current_setting('test.duplex_b')::uuid, '44444444-0000-0000-0000-00000000000a', 'X', now()) $$,
  '42501', null,
  'Pas de visite sur l''annonce d''un autre'
);
select lives_ok(
  $$ update public.visits_keyli set status = 'annulee' where visitor_nom = 'M. Kouassi' $$,
  'Une visite s''annule'
);
select throws_ok($$ delete from public.visits_keyli $$, '42501', null,
  'Une visite annulée ne disparaît pas (pas de suppression)');
select results_eq(
  $$ select count(*)::int from public.visits_keyli where status = 'annulee' $$,
  $$ values (1) $$,
  'La visite annulée reste dans l''historique'
);

-- ------------------------------------------------------------
-- Cloisonnement
-- ------------------------------------------------------------
select pg_temp.connecter('44444444-0000-0000-0000-00000000000b');  -- B
select results_eq(
  $$ select (select count(*) from public.leads_keyli)::int, (select count(*) from public.visits_keyli)::int $$,
  $$ values (0, 0) $$,
  'Une autre agence ne voit ni les leads ni les visites'
);
update public.leads_keyli set stage = 'conclu';

select pg_temp.connecter('44444444-0000-0000-0000-00000000000c');  -- C
select results_eq($$ select count(*)::int from public.leads_keyli $$, $$ values (0) $$,
  'Le chercheur ne voit pas l''état commercial de son contact');

set local role postgres;
select is(
  (select stage::text from public.leads_keyli where contact_user_id is not null),
  'negociation',
  'Le lead n''a pas été modifié par une autre agence'
);

select * from finish();
rollback;
