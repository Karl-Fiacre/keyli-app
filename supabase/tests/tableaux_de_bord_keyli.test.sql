-- Tests des tableaux de bord Propriétaire et Chercheur (semaine 16) :
-- score de pertinence, indicateurs, biens face au marché, alertes, visites.
-- Exécutés en local, en CI et sur le distant (--linked) : la base peut déjà
-- contenir des données, les vérifications portent sur les lignes du test.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(18);

-- O propriétaire ; C chercheur avec des signaux ; N chercheur sans signal
insert into auth.users (id, email, raw_user_meta_data) values
  ('dbdb0000-0000-0000-0000-00000000000a', 'o@test.local', '{"role_keyli": "owner", "first_name": "Yao", "last_name": "Kouadio"}'),
  ('dbdb0000-0000-0000-0000-00000000000c', 'c@test.local', '{"first_name": "Aminata", "last_name": "Diallo"}'),
  ('dbdb0000-0000-0000-0000-00000000000d', 'n@test.local', '{"first_name": "Nouveau", "last_name": "Venu"}');

select set_config('request.jwt.claims', '', true);
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'dbdb0000-0000-0000-0000-00000000000a', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';

insert into public.properties_keyli (id, owner_id, title, type, status, price, city, quartier_id, geolocation, is_verified, archived_at)
values
  ('dbdb1111-0000-0000-0000-000000000001', 'dbdb0000-0000-0000-0000-00000000000a', 'Villa Angré', 'villa', 'a_louer', 500000, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Angré'), 'SRID=4326;POINT(-3.98 5.39)', true, null),
  ('dbdb1111-0000-0000-0000-000000000002', 'dbdb0000-0000-0000-0000-00000000000a', 'Appartement Angré', 'appartement', 'a_louer', 300000, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Angré'), 'SRID=4326;POINT(-3.98 5.39)', false, null),
  ('dbdb1111-0000-0000-0000-000000000003', 'dbdb0000-0000-0000-0000-00000000000a', 'Appartement Marcory', 'appartement', 'a_louer', 280000, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Marcory Centre'), 'SRID=4326;POINT(-3.99 5.30)', true, null),
  ('dbdb1111-0000-0000-0000-000000000004', 'dbdb0000-0000-0000-0000-00000000000a', 'Villa Yopougon', 'villa', 'a_vendre', 90000000, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Yopougon Centre'), 'SRID=4326;POINT(-4.07 5.34)', false, null),
  ('dbdb1111-0000-0000-0000-000000000005', 'dbdb0000-0000-0000-0000-00000000000a', 'Archivé Angré', 'appartement', 'a_louer', 300000, 'Abidjan',
   (select id from public.quartiers_keyli where nom = 'Angré'), 'SRID=4326;POINT(-3.98 5.39)', false, now());

-- Prix moyen fiable du quartier Angré à la location (ligne du calcul nocturne)
insert into public.quartiers_tendance_keyli (niveau, zone_id, commune_id, nom, prix_moyen_location, prix_fiable, periode_debut, periode_fin)
select 'quartier', q.id, q.commune_id, q.nom, 400000, true, now() - interval '30 days', now()
  from public.quartiers_keyli q where q.nom = 'Angré'
on conflict (niveau, zone_id) do update set prix_moyen_location = 400000, prix_fiable = true;

-- Deux personnes distinctes écrivent ; C écrit deux fois sur le même bien
insert into public.messages_keyli (from_user, to_user, property_id, body) values
  ('dbdb0000-0000-0000-0000-00000000000c', 'dbdb0000-0000-0000-0000-00000000000a', 'dbdb1111-0000-0000-0000-000000000001', 'Bonjour'),
  ('dbdb0000-0000-0000-0000-00000000000c', 'dbdb0000-0000-0000-0000-00000000000a', 'dbdb1111-0000-0000-0000-000000000001', 'Toujours libre ?'),
  ('dbdb0000-0000-0000-0000-00000000000d', 'dbdb0000-0000-0000-0000-00000000000a', 'dbdb1111-0000-0000-0000-000000000002', 'Bonsoir');

-- Visite planifiée par O pour C demain
insert into public.visits_keyli (property_id, scheduled_by, visitor_user_id, scheduled_at)
values ('dbdb1111-0000-0000-0000-000000000001', 'dbdb0000-0000-0000-0000-00000000000a',
        'dbdb0000-0000-0000-0000-00000000000c', now() + interval '1 day');

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- ------------------------------------------------------------
-- Signaux de C : favori sur l'appartement d'Angré, consultation de
-- l'appartement de Marcory (et de la villa d'Angré par une autre session)
-- ------------------------------------------------------------
select pg_temp.connecter('dbdb0000-0000-0000-0000-00000000000c');
insert into public.favorites_keyli (user_id, property_id)
values ('dbdb0000-0000-0000-0000-00000000000c', 'dbdb1111-0000-0000-0000-000000000002');
insert into public.property_interactions_keyli (property_id, session_id, interaction_type) values
  ('dbdb1111-0000-0000-0000-000000000003', 'session-test-c1', 'view'),
  ('dbdb1111-0000-0000-0000-000000000001', 'session-test-c2', 'view');

select is(
  (select (public.preferences_chercheur_keyli() -> 'types' ->> 'appartement')::numeric),
  4::numeric, 'Préférences : favori ×3 + consultation ×1 sur le type appartement');

-- Préférences : Angré 3 (favori) + 1 (vue villa) = 4, Marcory 1 ; appartement
-- 4, villa 1 ; prix de référence location = médiane(300 000, 280 000, 500 000)
--   Villa Angré      : 40×4/4 + 25×1/4 + prix (écart 66 %) 0 + vérifiée 15 = 61
--   Appart. Marcory  : 40×1/4 + 25×4/4 + prix (écart 7 %) 20 + vérifiée 15 = 70
--   Villa Yopougon   : rien en commun → écartée (< 30)
select results_eq(
  $$ select id, pertinence from public.recommandations_keyli(30)
      where id::text like 'dbdb1111%' $$,
  $$ values ('dbdb1111-0000-0000-0000-000000000003'::uuid, 70), ('dbdb1111-0000-0000-0000-000000000001'::uuid, 61) $$,
  'Recommandations de C triées par pertinence, favori et archivée exclus');

-- ------------------------------------------------------------
-- Nouveau compte : pas de score, annonces visibles hors archivées
-- ------------------------------------------------------------
select pg_temp.connecter('dbdb0000-0000-0000-0000-00000000000d');
select is(
  (select count(*)::integer from public.recommandations_keyli(30)
    where id::text like 'dbdb1111%' and pertinence is null),
  (select count(*)::integer from public.recommandations_keyli(30) where id::text like 'dbdb1111%'),
  'Sans signal : aucune pertinence calculée');
select ok(
  not exists (select 1 from public.recommandations_keyli(30) where id = 'dbdb1111-0000-0000-0000-000000000005'),
  'Une annonce archivée n''est jamais recommandée');

-- Le propriétaire ne se voit pas recommander ses propres annonces
select pg_temp.connecter('dbdb0000-0000-0000-0000-00000000000a');
select ok(
  not exists (select 1 from public.recommandations_keyli(30) where id::text like 'dbdb1111%'),
  'Pas de recommandation de ses propres annonces');

-- ------------------------------------------------------------
-- Indicateurs du propriétaire
-- ------------------------------------------------------------
select is((public.tableau_bord_proprietaire_keyli(30) ->> 'annonces_actives')::integer, 4,
  'Annonces actives : archivée exclue');
select is((public.tableau_bord_proprietaire_keyli(30) ->> 'annonces_verifiees')::integer, 2,
  'Annonces vérifiées comptées');
select is((public.tableau_bord_proprietaire_keyli(30) ->> 'vues')::integer, 2,
  'Vues de la période sur ses annonces');
select is((public.tableau_bord_proprietaire_keyli(30) ->> 'contacts')::integer, 2,
  'Contacts : personnes distinctes par bien');
select is(jsonb_array_length(public.tableau_bord_proprietaire_keyli(30) -> 'serie_vues'), 30,
  'Série quotidienne sur 30 jours');
select is((public.tableau_bord_proprietaire_keyli(30) -> 'serie_vues' ->> 29)::integer, 2,
  'Les vues du jour sont dans le dernier point de la série');
select is((public.tableau_bord_proprietaire_keyli(3) ->> 'jours')::integer, 7,
  'Période ramenée à 7 jours au minimum');

-- Un autre compte ne voit rien des annonces de O
select pg_temp.connecter('dbdb0000-0000-0000-0000-00000000000c');
select is((public.tableau_bord_proprietaire_keyli(30) ->> 'vues')::integer, 0,
  'Le chercheur n''a aucune vue sur des annonces qui ne sont pas les siennes');

-- ------------------------------------------------------------
-- Biens face au prix moyen du quartier
-- ------------------------------------------------------------
select pg_temp.connecter('dbdb0000-0000-0000-0000-00000000000a');
select results_eq(
  $$ select titre, prix_moyen, ecart_pct from public.mes_biens_marche_keyli()
      where quartier = 'Angré' order by titre $$,
  $$ values ('Appartement Angré', 400000::numeric, -25.0::numeric), ('Villa Angré', 400000::numeric, 25.0::numeric) $$,
  'Écart au prix moyen fiable du quartier, annonces archivées exclues');

-- ------------------------------------------------------------
-- Alertes du chercheur
-- ------------------------------------------------------------
select pg_temp.connecter('dbdb0000-0000-0000-0000-00000000000c');
insert into public.search_alerts_keyli (user_id, criteres)
select 'dbdb0000-0000-0000-0000-00000000000c',
       jsonb_build_object('quartier_id', q.id, 'type', 'appartement', 'prix_min', 299999, 'prix_max', 300001)
  from public.quartiers_keyli q where q.nom = 'Angré';
select results_eq(
  $$ select quartier, commune, nouvelles from public.mes_alertes_keyli() $$,
  $$ values ('Angré'::text, 'Cocody'::text, 1) $$,
  'Alerte avec nom du quartier et nouveautés visibles (archivée exclue)');

select pg_temp.connecter('dbdb0000-0000-0000-0000-00000000000a');
select is((select count(*)::integer from public.mes_alertes_keyli()), 0,
  'Les alertes d''un autre compte restent invisibles');

-- ------------------------------------------------------------
-- Visites à venir, vues des deux côtés
-- ------------------------------------------------------------
select is((select nom from public.mes_visites_a_venir_keyli() where titre = 'Villa Angré'), 'Aminata D.',
  'Le propriétaire voit le nom du visiteur');
select pg_temp.connecter('dbdb0000-0000-0000-0000-00000000000c');
select is((select nom from public.mes_visites_a_venir_keyli() where titre = 'Villa Angré'), 'Yao K.',
  'Le visiteur voit le nom du propriétaire');

select * from finish();
rollback;
