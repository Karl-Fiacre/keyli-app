-- Tests des photos d'annonce (migration 20261105120000_photos_annonces_keyli)
-- — exécutés par `npm run db:test` (pgTAP), en local, en CI et sur le
-- projet distant (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(20);

-- P propriétaire abonné, Q autre propriétaire abonné
insert into auth.users (id, email, raw_user_meta_data) values
  ('f0f00000-0000-0000-0000-000000000001', 'p-photos@test.local', '{"role_keyli": "owner"}'),
  ('f0f00000-0000-0000-0000-000000000002', 'q-photos@test.local', '{"role_keyli": "owner"}');

insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select u.id, p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from unnest(array['f0f00000-0000-0000-0000-000000000001', 'f0f00000-0000-0000-0000-000000000002']::uuid[]) u(id)
  join public.plans_keyli p on p.code = 'proprietaire';

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Adresse d'une photo Keyli dans le dossier du compte donné
create function pg_temp.photo(proprietaire uuid default null) returns text
language sql volatile as $$
  select 'https://res.cloudinary.com/' || public.cloudinary_cloud_keyli()
      || '/image/upload/v1700000000/keyli/annonces/' || coalesce(proprietaire, (select auth.uid()))::text
      || '/' || gen_random_uuid()::text || '.jpg';
$$;
grant execute on function pg_temp.photo(uuid) to authenticated;

-- n photos Keyli du compte connecté
create function pg_temp.photos(n integer) returns text[]
language sql volatile as $$
  select array_agg(pg_temp.photo()) from generate_series(1, n);
$$;
grant execute on function pg_temp.photos(integer) to authenticated;

create function pg_temp.publier(photos text[]) returns uuid
language sql as $$
  select public.publier_annonce_keyli('Maison test', 'maison', 'a_louer', 200000, 'Abidjan', 5.35, -4.0, photos);
$$;
grant execute on function pg_temp.publier(text[]) to authenticated;

-- ------------------------------------------------------------
-- Adresses acceptées
-- ------------------------------------------------------------
select ok(public.url_photo_keyli_valide(
  'https://res.cloudinary.com/' || public.cloudinary_cloud_keyli()
  || '/image/upload/keyli/annonces/f0f00000-0000-0000-0000-000000000001/0b6f3c1e-2a4d-4c8e-9f10-1234567890ab.webp',
  'f0f00000-0000-0000-0000-000000000001'), 'Photo Keyli du compte acceptée (sans numéro de version)');
select ok(not public.url_photo_keyli_valide(
  'https://res.cloudinary.com/autre-compte/image/upload/keyli/annonces/f0f00000-0000-0000-0000-000000000001/0b6f3c1e-2a4d-4c8e-9f10-1234567890ab.jpg',
  'f0f00000-0000-0000-0000-000000000001'), 'Photo d''un autre compte Cloudinary refusée');
select ok(not public.url_photo_keyli_valide(
  'https://res.cloudinary.com/' || public.cloudinary_cloud_keyli()
  || '/image/upload/keyli/annonces/f0f00000-0000-0000-0000-000000000001/0b6f3c1e-2a4d-4c8e-9f10-1234567890ab.svg',
  'f0f00000-0000-0000-0000-000000000001'), 'Format non autorisé (SVG) refusé');

-- ------------------------------------------------------------
-- Publication
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('f0f00000-0000-0000-0000-000000000001');

select set_config('test.p1', pg_temp.photo(), true);
select set_config('test.p2', pg_temp.photo(), true);
select set_config('test.p3', pg_temp.photo(), true);

select throws_ok($$ select pg_temp.publier('{}') $$, '23514', 'Ajoutez au moins une photo',
  'Publication sans photo refusée');
select throws_ok($$ select pg_temp.publier(pg_temp.photos(11)) $$, '23514', 'Une annonce compte au plus 10 photos',
  'Plus de 10 photos refusé');
select throws_ok($$ select pg_temp.publier(array['https://exemple.test/maison.jpg']) $$, '23514',
  'Photo refusée : elle doit être envoyée depuis Keyli', 'Adresse d''image quelconque refusée');
select throws_ok($$ select pg_temp.publier(array[pg_temp.photo('f0f00000-0000-0000-0000-000000000002')]) $$, '23514',
  'Photo refusée : elle doit être envoyée depuis Keyli', 'Photo du dossier d''un autre compte refusée');
select throws_ok(
  $$ select pg_temp.publier(array[current_setting('test.p1'), current_setting('test.p1')]) $$,
  '23514', null, 'La même photo deux fois refusée');

select set_config('test.annonce', pg_temp.publier(array[
  current_setting('test.p1'), current_setting('test.p2'), current_setting('test.p3')])::text, true);

select results_eq(
  $$ select url, order_index from public.property_media_keyli
      where property_id = current_setting('test.annonce')::uuid order by order_index $$,
  $$ values (current_setting('test.p1'), 0), (current_setting('test.p2'), 1), (current_setting('test.p3'), 2) $$,
  'Photos enregistrées dans l''ordre du formulaire');
select is((select main_image_url from public.properties_keyli where id = current_setting('test.annonce')::uuid),
  current_setting('test.p1'), 'La première photo devient la photo principale');

-- ------------------------------------------------------------
-- Gestion depuis « Mes annonces »
-- ------------------------------------------------------------
-- Nouvel ordre en une écriture : la photo principale suit
select lives_ok(
  $$ select public.ordonner_photos_keyli(current_setting('test.annonce')::uuid, array(
       select id from public.property_media_keyli
        where property_id = current_setting('test.annonce')::uuid order by order_index desc)) $$,
  'Le propriétaire réordonne ses photos');
select is((select main_image_url from public.properties_keyli where id = current_setting('test.annonce')::uuid),
  current_setting('test.p3'), 'La photo principale suit le nouvel ordre');
select throws_ok(
  $$ select public.ordonner_photos_keyli(current_setting('test.annonce')::uuid, array[gen_random_uuid()]) $$,
  '23514', null, 'Une liste de photos incomplète ou étrangère est refusée');

select throws_ok(
  $$ insert into public.property_media_keyli (property_id, media_type, url)
     values (current_setting('test.annonce')::uuid, 'image', 'https://exemple.test/x.jpg') $$,
  '42501', null, 'Ajout d''une adresse d''image quelconque refusé');
select lives_ok(
  $$ insert into public.property_media_keyli (property_id, media_type, url, order_index)
     select current_setting('test.annonce')::uuid, 'image', u, 3 + row_number() over ()
       from unnest(pg_temp.photos(7)) u $$,
  'Ajout de photos Keyli jusqu''à 10');
select throws_ok(
  $$ insert into public.property_media_keyli (property_id, media_type, url)
     values (current_setting('test.annonce')::uuid, 'image', pg_temp.photo()) $$,
  '23514', 'Une annonce compte au plus 10 photos', 'Onzième photo refusée');

select lives_ok(
  $$ delete from public.property_media_keyli
      where property_id = current_setting('test.annonce')::uuid and url <> current_setting('test.p3') $$,
  'Retrait de photos tant qu''il en reste une');
select throws_ok(
  $$ delete from public.property_media_keyli where property_id = current_setting('test.annonce')::uuid $$,
  '23514', 'Une annonce doit garder au moins une photo', 'La dernière photo ne se retire pas');

-- Un autre propriétaire ne touche pas aux photos de l'annonce
select pg_temp.connecter('f0f00000-0000-0000-0000-000000000002');
select throws_ok(
  $$ insert into public.property_media_keyli (property_id, media_type, url)
     values (current_setting('test.annonce')::uuid, 'image', pg_temp.photo()) $$,
  '42501', null, 'Un autre compte n''ajoute pas de photo à l''annonce');
delete from public.property_media_keyli where property_id = current_setting('test.annonce')::uuid;

set local role postgres;
select is((select count(*)::int from public.property_media_keyli where property_id = current_setting('test.annonce')::uuid),
  1, 'Un autre compte ne retire pas les photos de l''annonce');

select * from finish();
rollback;
