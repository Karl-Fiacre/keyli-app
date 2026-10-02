-- Tests RLS de properties_keyli / property_media_keyli — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(28);

-- ------------------------------------------------------------
-- Comptes de test : A et B agences, P propriétaire, U chercheur
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'agence1@test.local', '{"role_keyli": "agency"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'agence2@test.local', '{"role_keyli": "agency"}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'proprio@test.local', '{"role_keyli": "owner"}'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'chercheur@test.local', '{}');

insert into public.agency_agents_keyli (agency_user_id, nom) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mariam Koné'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Agent agence 2');

-- Abonnements actifs : la publication exige un forfait en cours
-- (migration 20261002160000_limite_forfait_publication_keyli.sql)
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select u.id, p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from (values ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'proprietaire'),
               ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'agence_moyenne')) as u(id, code)
  join public.plans_keyli p on p.code = u.code;

-- Registre de commerce approuvé : obligatoire pour qu'une agence publie
-- (migration 20261002190000_admin_backoffice_keyli.sql)
insert into public.documents_keyli (user_id, doc_type, file_url, status)
select id, 'registre', id::text || '/registre.pdf', 'approved'
  from unnest(array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']::uuid[]) as id;

-- Identifiant réel de l'agent de B : un attaquant passerait l'UUID brut,
-- pas une recherche par nom (que la RLS lui masque)
select set_config('test.agent_b',
  (select id::text from public.agency_agents_keyli where nom = 'Agent agence 2'), true);

-- ------------------------------------------------------------
-- Structure
-- ------------------------------------------------------------
select has_table('public', 'properties_keyli', 'La table properties_keyli existe');
select has_table('public', 'property_media_keyli', 'La table property_media_keyli existe');
select is(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.properties_keyli'::regclass, 'public.property_media_keyli'::regclass)),
  true,
  'RLS est activée sur les deux tables'
);
select has_index('public', 'properties_keyli', 'idx_properties_geolocation',
  'Index spatial GiST présent (recherche par rayon)');
select col_not_null('public', 'properties_keyli', 'geolocation',
  'Le point GPS est obligatoire');

-- ------------------------------------------------------------
-- Propriétaire P connecté
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.properties_keyli (owner_id, title, type, status, price, city, quartier_id, geolocation)
     values
       ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Villa Riviera', 'villa', 'a_louer', 450000, 'Abidjan',
        (select id from public.quartiers_keyli where nom = 'Riviera'), 'SRID=4326;POINT(-3.9622 5.3600)'),
       ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Studio Plateau', 'studio', 'a_louer', 150000, 'Abidjan',
        (select id from public.quartiers_keyli where nom = 'Plateau Centre'), 'SRID=4326;POINT(-4.0167 5.3200)') $$,
  'Un propriétaire publie ses annonces'
);
select throws_ok(
  $$ insert into public.properties_keyli (owner_id, title, type, status, price, city)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Sans GPS', 'maison', 'a_louer', 1, 'Abidjan') $$,
  '23502', null,
  'Une annonce sans point GPS est refusée'
);
select throws_ok(
  $$ insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Au nom d''un autre', 'maison', 'a_louer', 1, 'Abidjan',
             'SRID=4326;POINT(-4 5.3)') $$,
  '42501', null,
  'Un propriétaire ne peut pas publier au nom d''un autre compte'
);
select throws_ok(
  $$ insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation, is_verified)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Auto-vérifiée', 'maison', 'a_louer', 1, 'Abidjan',
             'SRID=4326;POINT(-4 5.3)', true) $$,
  '42501', null,
  'Un propriétaire ne peut pas publier une annonce déjà « vérifiée »'
);
select lives_ok(
  $$ update public.properties_keyli set price = 425000 where title = 'Villa Riviera' $$,
  'Un propriétaire modifie le prix de son annonce'
);
select throws_ok(
  $$ update public.properties_keyli set is_verified = true where title = 'Villa Riviera' $$,
  '42501', null,
  'Un propriétaire ne peut pas se déclarer vérifié'
);
select throws_ok(
  $$ update public.properties_keyli set views_count = 9999 where title = 'Villa Riviera' $$,
  '42501', null,
  'Un propriétaire ne peut pas gonfler son compteur de vues'
);
select throws_ok(
  $$ update public.properties_keyli set main_image_url = 'https://exemple.test/x.jpg' where title = 'Villa Riviera' $$,
  '42501', null,
  'main_image_url ne se saisit pas à la main'
);
select throws_ok(
  $$ delete from public.properties_keyli where title = 'Studio Plateau' $$,
  '42501', null,
  'Une annonce ne se supprime pas'
);

-- Médias : deux images, l'ordre 0 doit devenir l'image principale
select lives_ok(
  $$ insert into public.property_media_keyli (property_id, media_type, url, order_index)
     select id, 'image', u, o from public.properties_keyli,
            (values ('https://exemple.test/salon.jpg', 1), ('https://exemple.test/facade.jpg', 0)) as v(u, o)
      where title = 'Villa Riviera' $$,
  'Un propriétaire ajoute des photos à son annonce'
);
select is(
  (select main_image_url from public.properties_keyli where title = 'Villa Riviera'),
  'https://exemple.test/facade.jpg',
  'L''image principale est la photo d''ordre 0'
);
select lives_ok(
  $$ delete from public.property_media_keyli where url = 'https://exemple.test/facade.jpg' $$,
  'Un propriétaire retire une photo'
);
select is(
  (select main_image_url from public.properties_keyli where title = 'Villa Riviera'),
  'https://exemple.test/salon.jpg',
  'L''image principale suit la photo restante'
);

-- Archivage
select lives_ok(
  $$ update public.properties_keyli set archived_at = now() where title = 'Studio Plateau' $$,
  'Un propriétaire archive son annonce'
);
select results_eq(
  $$ select count(*)::int from public.properties_keyli $$,
  $$ values (2) $$,
  'Le propriétaire voit encore son annonce archivée'
);

-- ------------------------------------------------------------
-- Agence A connectée
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.properties_keyli (owner_id, agent_id, title, type, status, price, city, geolocation)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             (select id from public.agency_agents_keyli where nom = 'Mariam Koné'),
             'Duplex Angré', 'duplex', 'a_vendre', 95000000, 'Abidjan', 'SRID=4326;POINT(-3.99 5.40)') $$,
  'Une agence publie une annonce attribuée à son agent'
);
select throws_ok(
  $$ insert into public.properties_keyli (owner_id, agent_id, title, type, status, price, city, geolocation)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             current_setting('test.agent_b')::uuid,
             'Agent volé', 'duplex', 'a_vendre', 1, 'Abidjan', 'SRID=4326;POINT(-3.99 5.40)') $$,
  '42501', null,
  'Une agence ne peut pas attribuer une annonce à l''agent d''une autre agence'
);

-- ------------------------------------------------------------
-- Chercheur U connecté
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
     values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Chercheur publie', 'studio', 'a_louer', 1, 'Abidjan',
             'SRID=4326;POINT(-4 5.3)') $$,
  '42501', null,
  'Un chercheur (rôle user) ne peut pas publier'
);
select throws_ok(
  $$ insert into public.property_media_keyli (property_id, media_type, url)
     select id, 'image', 'https://exemple.test/pirate.jpg' from public.properties_keyli where title = 'Villa Riviera' $$,
  '42501', null,
  'Un chercheur ne peut pas ajouter de photo à l''annonce d''un autre'
);

-- Tentative de modification de l'annonce d'autrui : aucune ligne touchée
update public.properties_keyli set price = 1 where title = 'Villa Riviera';

-- ------------------------------------------------------------
-- Visiteur anonyme
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select set_eq(
  $$ select title from public.properties_keyli $$,
  array['Villa Riviera', 'Duplex Angré'],
  'Un visiteur voit les annonces publiées (vérifiées ou non), pas les archivées'
);
select results_eq(
  $$ select count(*)::int from public.property_media_keyli $$,
  $$ values (1) $$,
  'Un visiteur voit les photos des annonces publiées'
);
select results_eq(
  $$ select count(*)::int from public.properties_keyli
      where extensions.st_dwithin(geolocation, 'SRID=4326;POINT(-3.9622 5.3600)'::extensions.geography, 2000) $$,
  $$ values (1) $$,
  'La recherche par rayon (2 km autour de la Riviera) fonctionne'
);

-- ------------------------------------------------------------
-- Vérification finale
-- ------------------------------------------------------------
set local role postgres;
select is(
  (select price from public.properties_keyli where title = 'Villa Riviera'),
  425000::numeric,
  'Le prix n''a pas été modifié par un autre utilisateur'
);

select * from finish();
rollback;
