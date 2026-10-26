-- Tests de la recherche d'annonces — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant (`--linked`).
-- Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(16);

-- P et Q : propriétaires abonnés (Grande Agence pour ne pas buter sur le
-- seuil) ; X : abonnement échu (annonces masquées)
insert into auth.users (id, email, raw_user_meta_data) values
  ('cdcd0000-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "agency", "nom_agence": "Agence P"}'),
  ('cdcd0000-0000-0000-0000-000000000002', 'x@test.local', '{"role_keyli": "owner"}');
insert into public.documents_keyli (user_id, doc_type, file_url, status)
values ('cdcd0000-0000-0000-0000-000000000001', 'registre', 'cdcd/registre.pdf', 'approved');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select u.id, p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from (values ('cdcd0000-0000-0000-0000-000000000001'::uuid, 'grande_agence'),
               ('cdcd0000-0000-0000-0000-000000000002'::uuid, 'proprietaire')) u(id, code)
  join public.plans_keyli p on p.code = u.code;

select set_config('test.cocody', (select q.id::text from public.quartiers_keyli q where q.nom = 'Angré'), true);
select set_config('test.commune_cocody', (select c.id::text from public.communes_keyli c where c.nom = 'Cocody'), true);
select set_config('test.yop', (select q.id::text from public.quartiers_keyli q where q.nom = 'Yopougon Centre'), true);
select set_config('test.clim', (select id::text from public.avantages_keyli where code = 'climatisation'), true);
select set_config('test.parking', (select id::text from public.avantages_keyli where code = 'parking'), true);

-- Annonces (écriture serveur ; owner_id explicite)
insert into public.properties_keyli (id, owner_id, title, type, status, price, city, quartier_id, geolocation, rooms, furnished, created_at)
values
  ('cdcd1111-0000-0000-0000-000000000001', 'cdcd0000-0000-0000-0000-000000000001', 'Appart Angré clim parking', 'appartement', 'a_louer', 250000, 'Abidjan', current_setting('test.cocody')::uuid, 'SRID=4326;POINT(-3.98 5.39)', 3, true, now() - interval '3 days'),
  ('cdcd1111-0000-0000-0000-000000000002', 'cdcd0000-0000-0000-0000-000000000001', 'Studio Angré clim', 'studio', 'a_louer', 120000, 'Abidjan', current_setting('test.cocody')::uuid, 'SRID=4326;POINT(-3.98 5.39)', 1, false, now() - interval '1 day'),
  ('cdcd1111-0000-0000-0000-000000000003', 'cdcd0000-0000-0000-0000-000000000001', 'Villa Yopougon', 'villa', 'a_vendre', 60000000, 'Abidjan', current_setting('test.yop')::uuid, 'SRID=4326;POINT(-4.08 5.34)', 5, false, now() - interval '2 days'),
  ('cdcd1111-0000-0000-0000-000000000004', 'cdcd0000-0000-0000-0000-000000000001', 'Ancienne annonce', 'studio', 'a_louer', 90000, 'Abidjan', current_setting('test.yop')::uuid, 'SRID=4326;POINT(-4.08 5.34)', 1, false, now()),
  ('cdcd1111-0000-0000-0000-000000000005', 'cdcd0000-0000-0000-0000-000000000002', 'Annonce masquée', 'studio', 'a_louer', 80000, 'Abidjan', current_setting('test.yop')::uuid, 'SRID=4326;POINT(-4.08 5.34)', 1, false, now());

insert into public.property_avantages_keyli (property_id, avantage_id) values
  ('cdcd1111-0000-0000-0000-000000000001', current_setting('test.clim')::uuid),
  ('cdcd1111-0000-0000-0000-000000000001', current_setting('test.parking')::uuid),
  ('cdcd1111-0000-0000-0000-000000000002', current_setting('test.clim')::uuid);

-- La villa est vérifiée ; une annonce archivée ; X perd son abonnement
update public.properties_keyli set is_verified = true where id = 'cdcd1111-0000-0000-0000-000000000003';
update public.properties_keyli set archived_at = now() where id = 'cdcd1111-0000-0000-0000-000000000004';
update public.subscriptions_keyli set start_date = now() - interval '2 months', end_date = now() - interval '1 hour'
 where user_id = 'cdcd0000-0000-0000-0000-000000000002';

create function pg_temp.ids(sql text) returns text[]
language plpgsql as $$
declare r text[];
begin
  execute 'select array_agg(right(s.id::text, 1)) from (' || sql || ') s' into r;
  return r;
end;
$$;
grant execute on function pg_temp.ids(text) to anon;

-- ------------------------------------------------------------
-- Visiteur anonyme
-- ------------------------------------------------------------
set local role anon;
select is(pg_temp.ids('select * from public.rechercher_annonces_keyli()'), array['3', '2', '1'],
  'Sans filtre : vérifiées d''abord, puis les plus récentes ; archivée et masquée exclues');
select is((select total from public.rechercher_annonces_keyli() limit 1), 3::bigint, 'Le total sert à la pagination');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_tri => 'recent') $q$), array['2', '3', '1'],
  'Tri « plus récentes »');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_tri => 'prix_croissant') $q$), array['2', '1', '3'],
  'Tri par prix croissant');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_tri => 'prix_decroissant') $q$), array['3', '1', '2'],
  'Tri par prix décroissant');

select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_statut => 'a_vendre') $q$), array['3'], 'Filtre à vendre');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_type => 'studio') $q$), array['2'], 'Filtre type');
select is(pg_temp.ids(format($q$ select * from public.rechercher_annonces_keyli(p_quartier => %L) $q$, current_setting('test.yop'))),
  array['3'], 'Filtre quartier');
select is(pg_temp.ids(format($q$ select * from public.rechercher_annonces_keyli(p_commune => %L) $q$, current_setting('test.commune_cocody'))),
  array['2', '1'], 'Filtre commune (tous ses quartiers)');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_prix_min => 100000, p_prix_max => 200000) $q$),
  array['2'], 'Fourchette de prix');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_pieces_min => 3) $q$), array['3', '1'], 'Pièces minimum');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_meuble => true) $q$), array['1'], 'Meublé');
select is(pg_temp.ids(format($q$ select * from public.rechercher_annonces_keyli(p_avantages => array[%L]::uuid[]) $q$, current_setting('test.clim'))),
  array['2', '1'], 'Avec climatisation');
select is(pg_temp.ids(format($q$ select * from public.rechercher_annonces_keyli(p_avantages => array[%L, %L]::uuid[]) $q$,
  current_setting('test.clim'), current_setting('test.parking'))),
  array['1'], 'Plusieurs avantages : l''annonce doit les avoir tous');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_limite => 2, p_decalage => 2) $q$), array['1'],
  'Pagination : page suivante');
select is((select count(*)::int from public.rechercher_annonces_keyli(p_limite => 1000)), 3,
  'La taille de page est plafonnée (50) sans casser la requête');

select * from finish();
rollback;
