-- Tests de l'ouverture de Korhogo et Daloa (migration 20261121120000) —
-- exécutés par `npm run db:test` (pgTAP). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(5);

-- Gratuité active pendant le test (le propriétaire n'a pas d'abonnement)
update public.pilote_gratuite_keyli
   set debut = now() - interval '1 day', fin = now() + interval '1 day';

insert into auth.users (id, email, raw_user_meta_data) values
  ('d1d20000-0000-0000-0000-000000000001', 'k@villes.local', '{"role_keyli": "owner"}');

select is((select array_agg(ville order by ville) from public.communes_keyli
            where nom in ('Korhogo', 'Daloa')),
          array['Daloa', 'Korhogo'], 'Korhogo et Daloa existent, chacune comme ville');
select is((select array_agg(q.nom order by q.nom) from public.quartiers_keyli q
             join public.communes_keyli c on c.id = q.commune_id
            where c.ville in ('Korhogo', 'Daloa')),
          array['Daloa Centre', 'Korhogo Centre'], 'Un quartier « Centre » par ville');
select is((select count(*)::integer from public.communes_keyli where nom in ('Korhogo', 'Daloa')), 2,
          'Pas de doublon de commune');

select set_config('test.korhogo', (select q.id::text from public.quartiers_keyli q where q.nom = 'Korhogo Centre'), true);
set local role authenticated;
select set_config('request.jwt.claims',
                  json_build_object('sub', 'd1d20000-0000-0000-0000-000000000001', 'role', 'authenticated', 'aal', 'aal2')::text, true);

select lives_ok($q$
  insert into public.properties_keyli (owner_id, title, type, status, price, city, quartier_id, geolocation)
  values ((select auth.uid()), 'Villa Korhogo', 'appartement', 'a_louer', 60000, 'Abidjan',
          current_setting('test.korhogo')::uuid, 'SRID=4326;POINT(-5.63 9.46)')
$q$, 'Publication gratuite à Korhogo pendant le pilote');
select is((select city from public.properties_keyli where title = 'Villa Korhogo'), 'Korhogo',
          'La ville de l''annonce vient du quartier');

select * from finish();
rollback;
