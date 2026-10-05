-- Tests de property_interactions_keyli et des compteurs d'annonces —
-- exécutés par `npm run db:test` (pgTAP), en local, en CI et sur le projet
-- distant (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(20);

-- ------------------------------------------------------------
-- Comptes : P et Q propriétaires, C chercheur
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('66666666-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}'),
  ('66666666-0000-0000-0000-000000000002', 'q@test.local', '{"role_keyli": "owner"}'),
  ('66666666-0000-0000-0000-000000000003', 'c@test.local', '{}');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select u.id, p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from unnest(array['66666666-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000002']::uuid[]) as u(id)
  join public.plans_keyli p on p.code = 'proprietaire';
insert into public.properties_keyli (owner_id, title, type, status, price, city, quartier_id, geolocation) values
  ('66666666-0000-0000-0000-000000000001', 'Villa Riviera', 'villa', 'a_louer', 1, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Riviera'), 'SRID=4326;POINT(-3.96 5.36)'),
  ('66666666-0000-0000-0000-000000000001', 'Villa archivée', 'villa', 'a_louer', 1, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Angré'), 'SRID=4326;POINT(-3.97 5.37)');
update public.properties_keyli set archived_at = now() where title = 'Villa archivée';
-- updated_at de référence, antidaté pour vérifier qu'une vue ne le change pas
update public.properties_keyli set title = 'Villa Riviera' where title = 'Villa Riviera';
update public.properties_keyli set updated_at = '2026-01-01' where title = 'Villa Riviera';

select set_config('test.villa',    (select id::text from public.properties_keyli where title = 'Villa Riviera'), true);
select set_config('test.archivee', (select id::text from public.properties_keyli where title = 'Villa archivée'), true);
select set_config('test.angre',    (select id::text from public.quartiers_keyli where nom = 'Angré'), true);
select set_config('test.riviera',  (select id::text from public.quartiers_keyli where nom = 'Riviera'), true);

create function pg_temp.vue(session text) returns void
language sql as $$
  insert into public.property_interactions_keyli (property_id, session_id, interaction_type, source)
  values (current_setting('test.villa')::uuid, session, 'view', 'search');
$$;
create function pg_temp.compteurs() returns table (vues integer, contacts integer)
language sql security definer as $$
  select views_count, contacts_count from public.properties_keyli where title = 'Villa Riviera';
$$;

select is(
  (select relrowsecurity from pg_class where oid = 'public.property_interactions_keyli'::regclass),
  true,
  'RLS est activée sur property_interactions_keyli'
);

-- ------------------------------------------------------------
-- Visiteur anonyme : vues et anti-inflation
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select lives_ok($$ select pg_temp.vue('session-visiteur-1') $$, 'Un visiteur anonyme enregistre une vue');
select results_eq($$ select vues from pg_temp.compteurs() $$, $$ values (1) $$, 'La vue est comptée');
select lives_ok($$ select pg_temp.vue('session-visiteur-1') $$, 'Le même visiteur rafraîchit la page');
select results_eq($$ select vues from pg_temp.compteurs() $$, $$ values (1) $$,
  'Anti-inflation : même session, même bien, moins de 30 min → pas recomptée');
select lives_ok($$ select pg_temp.vue('session-visiteur-2') $$, 'Un autre visiteur consulte le bien');
select results_eq($$ select vues from pg_temp.compteurs() $$, $$ values (2) $$, 'Une autre session est comptée');

set local role postgres;
update public.property_interactions_keyli set created_at = now() - interval '31 minutes'
 where session_id = 'session-visiteur-1';
set local role anon;
select pg_temp.vue('session-visiteur-1');
select results_eq($$ select vues from pg_temp.compteurs() $$, $$ values (3) $$,
  'Après 30 minutes, la même session est de nouveau comptée');

select lives_ok(
  $$ insert into public.property_interactions_keyli (property_id, session_id, interaction_type)
     values (current_setting('test.villa')::uuid, 'session-visiteur-2', 'click_whatsapp') $$,
  'Un clic WhatsApp est enregistré'
);
select results_eq($$ select contacts from pg_temp.compteurs() $$, $$ values (1) $$, 'Le contact est compté');

select throws_ok(
  $$ insert into public.property_interactions_keyli (property_id, session_id, interaction_type)
     values (current_setting('test.archivee')::uuid, 'session-visiteur-1', 'view') $$,
  '42501', null, 'Pas d''événement sur une annonce archivée (invisible)'
);
select throws_ok(
  $$ insert into public.property_interactions_keyli (session_id, interaction_type)
     values ('session-visiteur-1', 'search_neighborhood') $$,
  '23514', null, 'Une recherche par quartier sans quartier est refusée'
);
select lives_ok(
  $$ insert into public.property_interactions_keyli (session_id, interaction_type, quartier_id, source)
     values ('session-visiteur-1', 'search_neighborhood', current_setting('test.angre')::uuid, 'quartier_tendance') $$,
  'Une recherche par quartier est enregistrée (source des quartiers tendance)'
);
select throws_ok(
  $$ insert into public.property_interactions_keyli (property_id, session_id, interaction_type)
     values (current_setting('test.villa')::uuid, 'x', 'view') $$,
  '23514', null, 'Un identifiant de session invalide est refusé'
);
select throws_ok(
  $$ insert into public.property_interactions_keyli (property_id, session_id, interaction_type, source)
     values (current_setting('test.villa')::uuid, 'session-visiteur-1', 'view', 'pirate') $$,
  '23514', null, 'Une source inconnue est refusée'
);
select throws_ok($$ select * from public.property_interactions_keyli $$, '42501', null,
  'Un visiteur ne lit pas les événements bruts');

-- ------------------------------------------------------------
-- Chercheur connecté : auteur imposé, quartier copié depuis l'annonce
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "66666666-0000-0000-0000-000000000003", "role": "authenticated"}', true);
insert into public.property_interactions_keyli (property_id, session_id, interaction_type, quartier_id)
  values (current_setting('test.villa')::uuid, 'session-chercheur', 'click_gallery', current_setting('test.angre')::uuid);

-- ------------------------------------------------------------
-- Propriétaire P / propriétaire Q
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "66666666-0000-0000-0000-000000000001", "role": "authenticated"}', true);
select results_eq(
  $$ select user_id::text, quartier_id::text from public.property_interactions_keyli where interaction_type = 'click_gallery' $$,
  $$ values ('66666666-0000-0000-0000-000000000003', current_setting('test.riviera')) $$,
  'Auteur imposé et quartier copié depuis l''annonce (pas celui envoyé par le client)'
);
select results_eq(
  $$ select count(*)::int from public.property_interactions_keyli where user_id is null and property_id is not null $$,
  $$ values (5) $$,
  'Le propriétaire lit les interactions de son bien (visiteurs anonymes inclus)'
);

select set_config('request.jwt.claims',
  '{"sub": "66666666-0000-0000-0000-000000000002", "role": "authenticated"}', true);
select results_eq($$ select count(*)::int from public.property_interactions_keyli $$, $$ values (0) $$,
  'Un autre propriétaire ne lit pas ces interactions');

-- ------------------------------------------------------------
-- Vérification finale
-- ------------------------------------------------------------
set local role postgres;
select is(
  (select updated_at from public.properties_keyli where title = 'Villa Riviera'),
  '2026-01-01'::timestamptz,
  'Les compteurs ne modifient pas la date de dernière modification de l''annonce'
);

select * from finish();
rollback;
