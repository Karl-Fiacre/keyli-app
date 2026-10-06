-- Tests des quartiers tendance — exécutés par `npm run db:test` (pgTAP), en
-- local, en CI et sur le projet distant (`--linked`). Transaction annulée à
-- la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(14);

-- ------------------------------------------------------------
-- Données : P propriétaire (forfait Grande Agence)
--   Riviera : 6 locations à 300 000 ce mois-ci, 2 à 250 000 le mois d'avant
--   Angré   : 2 locations à 200 000 ce mois-ci (pas assez pour être fiable)
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
  values ('aaaa0000-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
  select 'aaaa0000-0000-0000-0000-000000000001', id, prix_mensuel, now() - interval '1 day', now() + interval '1 month'
    from public.plans_keyli where code = 'grande_agence';

create function pg_temp.publier(titre text, quartier text, prix numeric) returns void
language sql as $$
  insert into public.properties_keyli (owner_id, title, type, status, price, city, quartier_id, geolocation)
  values ('aaaa0000-0000-0000-0000-000000000001', titre, 'appartement', 'a_louer', prix, 'Abidjan',
          (select id from public.quartiers_keyli where nom = quartier), 'SRID=4326;POINT(-3.96 5.36)');
$$;

select pg_temp.publier('Riviera ' || g, 'Riviera', 300000) from generate_series(1, 6) g;
select pg_temp.publier('Angré ' || g, 'Angré', 200000) from generate_series(1, 2) g;
select pg_temp.publier('Riviera ancien ' || g, 'Riviera', 250000) from generate_series(1, 2) g;
-- Les deux « anciennes » annonces : publiées il y a 45 jours, retirées il y a 40 jours
update public.properties_keyli set archived_at = now() where title like 'Riviera ancien%';
update public.property_publications_keyli
   set published_at = now() - interval '45 days', unpublished_at = now() - interval '40 days'
 where property_id in (select id from public.properties_keyli where title like 'Riviera ancien%');

-- Interactions : S1 et S2 cherchent Riviera, S1 et S3 voient une annonce de
-- Riviera, S4 voit une annonce d'Angré
insert into public.property_interactions_keyli (session_id, interaction_type, quartier_id) values
  ('session-0001', 'search_neighborhood', (select id from public.quartiers_keyli where nom = 'Riviera')),
  ('session-0002', 'search_neighborhood', (select id from public.quartiers_keyli where nom = 'Riviera'));
insert into public.property_interactions_keyli (property_id, session_id, interaction_type) values
  ((select id from public.properties_keyli where title = 'Riviera 1'), 'session-0001', 'view'),
  ((select id from public.properties_keyli where title = 'Riviera 2'), 'session-0003', 'view'),
  ((select id from public.properties_keyli where title = 'Angré 1'), 'session-0004', 'view');

select public.calculer_quartiers_tendance_keyli();

-- ------------------------------------------------------------
-- Structure et planification
-- ------------------------------------------------------------
select is(
  (select relrowsecurity from pg_class where oid = 'public.quartiers_tendance_keyli'::regclass),
  true, 'RLS est activée sur quartiers_tendance_keyli');
select is(
  (select schedule from cron.job where jobname = 'keyli-quartiers-tendance'),
  '0 2 * * *', 'Le recalcul est planifié chaque nuit à 02:00');
select is(
  (select count(*)::int from public.quartiers_tendance_keyli),
  (select (select count(*) from public.quartiers_keyli) + (select count(*) from public.communes_keyli))::int,
  'Une ligne par quartier et par commune');

-- ------------------------------------------------------------
-- Popularité
-- ------------------------------------------------------------
select results_eq(
  $$ select score_popularite, sessions_recherche, sessions_vue from public.quartiers_tendance_keyli
      where niveau = 'quartier' and nom = 'Riviera' $$,
  $$ values (3, 2, 2) $$,
  'Riviera : 3 sessions distinctes (2 recherches, 2 vues, S1 comptée une fois)');
select results_eq(
  $$ select score_popularite from public.quartiers_tendance_keyli where niveau = 'commune' and nom = 'Cocody' $$,
  $$ values (4) $$,
  'Cocody (commune) cumule les sessions de ses quartiers');
select results_eq(
  $$ select nom from public.quartiers_populaires_keyli limit 2 $$,
  $$ values ('Riviera'::text), ('Angré'::text) $$,
  'Les quartiers populaires sont classés par score');

-- ------------------------------------------------------------
-- Tendance des prix et repli sur la commune
-- ------------------------------------------------------------
select results_eq(
  $$ select prix_fiable, nb_location, prix_moyen_location, prix_moyen_location_prec, tendance_location_pct
       from public.quartiers_tendance_keyli where niveau = 'quartier' and nom = 'Riviera' $$,
  $$ values (true, 6, 300000.00::numeric, 250000.00::numeric, 20.0::numeric) $$,
  'Riviera : 6 annonces, loyer moyen 300 000 contre 250 000, soit +20 %');
select is(
  (select prix_fiable from public.quartiers_tendance_keyli where niveau = 'quartier' and nom = 'Angré'),
  false, 'Angré : moins de 5 annonces, prix jugés peu fiables');
select results_eq(
  $$ select niveau_affiche, nom_affiche from public.tendances_prix_keyli t
       join public.quartiers_keyli q on q.id = t.quartier_id where q.nom = 'Riviera' $$,
  $$ values ('quartier'::text, 'Riviera'::text) $$,
  'TrendBar : Riviera s''affiche à son propre niveau');
select results_eq(
  $$ select niveau_affiche, nom_affiche, prix_moyen_location from public.tendances_prix_keyli t
       join public.quartiers_keyli q on q.id = t.quartier_id where q.nom = 'Angré' $$,
  $$ values ('commune'::text, 'Cocody'::text, 275000.00::numeric) $$,
  'TrendBar : Angré se replie sur la commune de Cocody (8 annonces, 275 000 de moyenne)');

-- Un second calcul remplace l'instantané sans doublon
select public.calculer_quartiers_tendance_keyli();
select is(
  (select count(*)::int from public.quartiers_tendance_keyli where niveau = 'quartier' and nom = 'Riviera'),
  1, 'Un nouveau calcul remplace l''instantané');

-- ------------------------------------------------------------
-- Accès public en lecture seule
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select ok(
  (select count(*) from public.quartiers_populaires_keyli) >= 2,
  'Un visiteur lit les quartiers populaires (Accueil)');
select throws_ok(
  $$ update public.quartiers_tendance_keyli set score_popularite = 999 $$,
  '42501', null, 'Un visiteur ne modifie pas les tendances');
select throws_ok(
  $$ select public.calculer_quartiers_tendance_keyli() $$,
  '42501', null, 'Un visiteur ne déclenche pas le recalcul');

set local role postgres;
select * from finish();
rollback;
