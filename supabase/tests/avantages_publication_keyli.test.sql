-- Tests des avantages et de la publication atomique — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(18);

-- P propriétaire abonné (seuil 4), Q propriétaire sans abonnement,
-- C chercheur, S propriétaire abonné puis suspendu
insert into auth.users (id, email, raw_user_meta_data) values
  ('abab0000-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}'),
  ('abab0000-0000-0000-0000-000000000002', 'q@test.local', '{"role_keyli": "owner"}'),
  ('abab0000-0000-0000-0000-000000000003', 'c@test.local', '{}'),
  ('abab0000-0000-0000-0000-000000000004', 's@test.local', '{"role_keyli": "owner"}');

insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select u.id, p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from unnest(array['abab0000-0000-0000-0000-000000000001', 'abab0000-0000-0000-0000-000000000004']::uuid[]) u(id)
  join public.plans_keyli p on p.code = 'proprietaire';

select set_config('test.clim', (select id::text from public.avantages_keyli where code = 'climatisation'), true);
select set_config('test.ecole', (select id::text from public.avantages_keyli where code = 'ecole'), true);
select set_config('test.quartier', (select id::text from public.quartiers_keyli limit 1), true);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Publie une annonce standard pour le compte connecté
create function pg_temp.publier(titre text, avantages uuid[] default '{}', accord boolean default false) returns uuid
language sql as $$
  select public.publier_annonce_keyli(
    titre, 'appartement', 'a_louer', 150000, 'Abidjan', 5.35, -4.0,
    current_setting('test.quartier')::uuid, 'Bel appartement', 80, 3, 2, true, avantages, accord);
$$;
grant execute on function pg_temp.publier(text, uuid[], boolean) to authenticated;

-- ------------------------------------------------------------
-- Référentiel
-- ------------------------------------------------------------
set local role anon;
select ok((select count(*) from public.avantages_keyli) >= 15, 'Les avantages proposés sont lisibles par tous');
select ok((select count(distinct categorie) = 2 from public.avantages_keyli), 'Deux catégories : équipements et proximités');
select throws_ok($$ insert into public.avantages_keyli (code, libelle, categorie) values ('x', 'X', 'equipement') $$,
  '42501', null, 'Personne n''ajoute d''avantage depuis le client');

-- ------------------------------------------------------------
-- Publication
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('abab0000-0000-0000-0000-000000000001');
select set_config('test.annonce', pg_temp.publier('Appartement Cocody',
  array[current_setting('test.clim')::uuid, current_setting('test.ecole')::uuid, current_setting('test.clim')::uuid])::text, true);

select results_eq(
  $$ select title, owner_id::text, round(extensions.st_y(geolocation::extensions.geometry)::numeric, 2),
            round(extensions.st_x(geolocation::extensions.geometry)::numeric, 2), furnished
       from public.properties_keyli where id = current_setting('test.annonce')::uuid $$,
  $$ values ('Appartement Cocody'::text, 'abab0000-0000-0000-0000-000000000001'::text, 5.35::numeric, -4.00::numeric, true) $$,
  'Annonce publiée au nom de l''utilisateur, point GPS enregistré (latitude, longitude)');
select is((select count(*)::int from public.property_avantages_keyli where property_id = current_setting('test.annonce')::uuid),
  2, 'Avantages rattachés, sans doublon');
select is((select count(*)::int from public.property_publications_keyli where property_id = current_setting('test.annonce')::uuid),
  1, 'La mise en ligne est comptée dans le forfait');

select throws_ok($$ select pg_temp.publier('   ') $$, '23514', null, 'Titre obligatoire');
select throws_ok($$ select public.publier_annonce_keyli('T', 'studio', 'a_louer', 0, 'Abidjan', 5.3, -4.0) $$,
  '23514', null, 'Prix strictement positif');
select throws_ok($$ select public.publier_annonce_keyli('T', 'studio', 'a_louer', 1000, 'Abidjan', 95, -4.0) $$,
  '23514', null, 'Point GPS hors limites refusé');
select throws_ok($$ select pg_temp.publier('Inconnu', array[gen_random_uuid()]) $$,
  '23514', null, 'Avantage inconnu refusé');
select is((select count(*)::int from public.properties_keyli where title = 'Inconnu'),
  0, 'Publication atomique : rien n''est créé si un avantage est refusé');

-- Forfait : 3 de plus (4 au total), la 5e exige l'accord
select pg_temp.publier('A2'); select pg_temp.publier('A3'); select pg_temp.publier('A4');
select throws_ok($$ select pg_temp.publier('A5') $$, 'KY003', null,
  'Au-delà du seuil, l''accord de dépassement est exigé');
select lives_ok($$ select pg_temp.publier('A5', '{}', true) $$, 'Avec l''accord, l''annonce est publiée');

-- Avantages : seul le propriétaire modifie ceux de son annonce
select lives_ok($$ delete from public.property_avantages_keyli
                    where property_id = current_setting('test.annonce')::uuid and avantage_id = current_setting('test.ecole')::uuid $$,
  'Le propriétaire retire un avantage');

select pg_temp.connecter('abab0000-0000-0000-0000-000000000002');
select throws_ok($$ select pg_temp.publier('Sans abonnement') $$, 'KY001', null, 'Sans abonnement : publication refusée');
select throws_ok($$ insert into public.property_avantages_keyli (property_id, avantage_id)
                    values (current_setting('test.annonce')::uuid, current_setting('test.ecole')::uuid) $$,
  '42501', null, 'Un autre compte ne touche pas aux avantages de l''annonce');

select pg_temp.connecter('abab0000-0000-0000-0000-000000000003');
select throws_ok($$ select pg_temp.publier('Chercheur') $$, '42501', null, 'Un chercheur ne publie pas');

set local role anon;
select is((select count(*)::int from public.property_avantages_keyli where property_id = current_setting('test.annonce')::uuid),
  1, 'Les avantages d''une annonce visible sont publics');

select * from finish();
rollback;
