-- Tests des visites côté chercheur et des avis — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(22);

-- O propriétaire abonné ; C chercheur qui a écrit au sujet du bien ; X autre chercheur
insert into auth.users (id, email, raw_user_meta_data) values
  ('abcd0000-0000-0000-0000-00000000000a', 'o@test.local', '{"role_keyli": "owner", "first_name": "Yao", "last_name": "Kouadio"}'),
  ('abcd0000-0000-0000-0000-00000000000c', 'c@test.local', '{"first_name": "Aminata", "last_name": "Diallo"}'),
  ('abcd0000-0000-0000-0000-00000000000f', 'x@test.local', '{}');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'abcd0000-0000-0000-0000-00000000000a', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';
insert into public.properties_keyli (id, owner_id, title, type, status, price, city, geolocation)
values ('abcd1111-0000-0000-0000-000000000001', 'abcd0000-0000-0000-0000-00000000000a', 'Duplex Cocody',
        'duplex', 'a_louer', 400000, 'Abidjan', 'SRID=4326;POINT(-3.98 5.36)');
-- Premier message de C : crée le lead « nouveau »
insert into public.messages_keyli (from_user, to_user, property_id, body)
values ('abcd0000-0000-0000-0000-00000000000c', 'abcd0000-0000-0000-0000-00000000000a',
        'abcd1111-0000-0000-0000-000000000001', 'Bonjour, visite possible ?');

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.planifier(quand interval) returns void
language sql as $$
  insert into public.visits_keyli (property_id, scheduled_by, visitor_user_id, scheduled_at)
  values ('abcd1111-0000-0000-0000-000000000001', 'abcd0000-0000-0000-0000-00000000000a',
          'abcd0000-0000-0000-0000-00000000000c', now() + quand);
$$;
grant execute on function pg_temp.planifier(interval) to authenticated;

set local role authenticated;

-- ------------------------------------------------------------
-- Planification par le propriétaire
-- ------------------------------------------------------------
select pg_temp.connecter('abcd0000-0000-0000-0000-00000000000a');
select throws_ok($$ select pg_temp.planifier(interval '-1 hour') $$, '23514', null,
  'Une visite ne se planifie pas dans le passé');
select lives_ok($$ select pg_temp.planifier(interval '1 day') $$, 'Le propriétaire planifie une visite pour demain');
select is((select stage::text from public.leads_keyli where contact_user_id = 'abcd0000-0000-0000-0000-00000000000c'),
  'visite_planifiee', 'Le lead passe de « nouveau » à « visite planifiée »');
select ok((select lead_id is not null from public.visits_keyli limit 1), 'La visite est rattachée au lead du visiteur');

-- ------------------------------------------------------------
-- Côté chercheur
-- ------------------------------------------------------------
select pg_temp.connecter('abcd0000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.visits_keyli), 1, 'Le chercheur voit sa visite');
select results_eq($$ select type from public.notifications_keyli $$, $$ values ('visite_planifiee'::text) $$,
  'Le chercheur est notifié de la visite planifiée');
update public.visits_keyli set status = 'effectuee';
select is((select status::text from public.visits_keyli limit 1), 'planifiee',
  'Le chercheur ne peut pas modifier la visite (seul le propriétaire le peut)');
select throws_ok($$ insert into public.ratings_keyli (property_id, rater_id, rated_user_id, rating)
  values ('abcd1111-0000-0000-0000-000000000001', 'abcd0000-0000-0000-0000-00000000000c', 'abcd0000-0000-0000-0000-00000000000a', 5) $$,
  '42501', null, 'Pas d''avis avant que la visite soit effectuée');

select pg_temp.connecter('abcd0000-0000-0000-0000-00000000000f');
select is((select count(*)::int from public.visits_keyli), 0, 'Un autre chercheur ne voit pas cette visite');

-- ------------------------------------------------------------
-- Replanification, effectuée, définitive
-- ------------------------------------------------------------
select pg_temp.connecter('abcd0000-0000-0000-0000-00000000000a');
update public.visits_keyli set scheduled_at = now() + interval '2 days';
select throws_ok($$ update public.visits_keyli set status = 'effectuee' $$, '23514', null,
  'Pas de visite « effectuée » avant son heure');

set local role postgres;   -- le temps passe : la visite était hier (écriture serveur, sans identité)
select set_config('request.jwt.claims', '', true);
update public.visits_keyli set scheduled_at = now() - interval '1 day';
set local role authenticated;
select pg_temp.connecter('abcd0000-0000-0000-0000-00000000000a');
select lives_ok($$ update public.visits_keyli set status = 'effectuee' $$, 'Après l''heure prévue, la visite est marquée effectuée');
select throws_ok($$ update public.visits_keyli set status = 'annulee' $$, '23514', null,
  'Une visite effectuée est définitive');

select pg_temp.connecter('abcd0000-0000-0000-0000-00000000000c');
select results_eq($$ select type from public.notifications_keyli order by created_at, type $$,
  $$ values ('visite_effectuee'::text), ('visite_modifiee'::text), ('visite_modifiee'::text), ('visite_planifiee'::text) $$,
  'Notifications : planifiée, déplacée (deux fois, dont la mise à la veille du test), puis invitation à donner son avis');

-- ------------------------------------------------------------
-- Avis
-- ------------------------------------------------------------
select lives_ok($$ insert into public.ratings_keyli (property_id, rater_id, rated_user_id, rating, comment)
  values ('abcd1111-0000-0000-0000-000000000001', 'abcd0000-0000-0000-0000-00000000000c',
          'abcd0000-0000-0000-0000-00000000000a', 4, 'Propriétaire ponctuel, logement conforme.') $$,
  'Après la visite effectuée, le chercheur note le propriétaire');
select throws_ok($$ update public.ratings_keyli set comment = repeat('x', 501) $$, '23514', null,
  'Commentaire limité à 500 caractères');
select throws_ok($$ update public.ratings_keyli set rating = null $$, '23502', null, 'La note est obligatoire');

select pg_temp.connecter('abcd0000-0000-0000-0000-00000000000a');
select lives_ok($$ insert into public.ratings_keyli (property_id, rater_id, rated_user_id, rating)
  values ('abcd1111-0000-0000-0000-000000000001', 'abcd0000-0000-0000-0000-00000000000a',
          'abcd0000-0000-0000-0000-00000000000c', 5) $$,
  'Le propriétaire note aussi le chercheur (avis dans les deux sens)');

set local role anon;
select results_eq(
  $$ select note, commentaire, auteur, titre_bien from public.avis_recus_keyli('abcd0000-0000-0000-0000-00000000000a') $$,
  $$ values (4, 'Propriétaire ponctuel, logement conforme.'::text, 'Aminata D.'::text, 'Duplex Cocody'::text) $$,
  'Avis publics : note, commentaire, nom public de l''auteur, bien');

-- ------------------------------------------------------------
-- Annulation et pipeline jamais en arrière
-- ------------------------------------------------------------
set local role postgres;
update public.leads_keyli set stage = 'negociation' where contact_user_id = 'abcd0000-0000-0000-0000-00000000000c';
set local role authenticated;
select pg_temp.connecter('abcd0000-0000-0000-0000-00000000000a');
select pg_temp.planifier(interval '3 days');
select is((select stage::text from public.leads_keyli where contact_user_id = 'abcd0000-0000-0000-0000-00000000000c'),
  'negociation', 'Une nouvelle visite ne fait pas reculer un lead déjà en négociation');
update public.visits_keyli set status = 'annulee' where status = 'planifiee';
select is((select status::text from public.visits_keyli where status <> 'effectuee'), 'annulee', 'Le propriétaire annule une visite');

select pg_temp.connecter('abcd0000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.notifications_keyli where type = 'visite_annulee'), 1,
  'Le chercheur est notifié de l''annulation');

-- Écriture serveur (reprise d'historique) : non soumise aux garde-fous client
set local role postgres;
select set_config('request.jwt.claims', '', true);
select lives_ok($$ insert into public.visits_keyli (property_id, scheduled_by, visitor_nom, scheduled_at, status)
  values ('abcd1111-0000-0000-0000-000000000001', 'abcd0000-0000-0000-0000-00000000000a', 'Ancien visiteur',
          now() - interval '1 year', 'effectuee') $$,
  'Une reprise d''historique côté serveur peut enregistrer une visite passée');

select * from finish();
rollback;
