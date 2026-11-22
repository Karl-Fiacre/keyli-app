-- Tests du type « terrain » et du filtre multi-types de la recherche
-- (migration 20261123120000, accueil mobile par catégories) — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(5);

-- Agence abonnée (Grande Agence pour ne pas buter sur le seuil)
insert into auth.users (id, email, raw_user_meta_data) values
  ('cafe0000-0000-0000-0000-000000000001', 'categories@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Catégories"}');
insert into public.documents_keyli (user_id, doc_type, file_url, status)
values ('cafe0000-0000-0000-0000-000000000001', 'registre', 'cafe/registre.pdf', 'approved');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'cafe0000-0000-0000-0000-000000000001', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'grande_agence';

-- Un hôtel (1), une auberge (2), une villa (3) et un terrain en vente (4)
insert into public.properties_keyli (id, owner_id, title, type, status, price, city, geolocation, sejour_court)
values
  ('cafe1111-0000-0000-0000-000000000001', 'cafe0000-0000-0000-0000-000000000001', 'Hôtel', 'hotel', 'a_louer', 30000, 'Abidjan', 'SRID=4326;POINT(-3.99 5.36)', true),
  ('cafe1111-0000-0000-0000-000000000002', 'cafe0000-0000-0000-0000-000000000001', 'Auberge', 'auberge', 'a_louer', 15000, 'Abidjan', 'SRID=4326;POINT(-3.99 5.36)', true),
  ('cafe1111-0000-0000-0000-000000000003', 'cafe0000-0000-0000-0000-000000000001', 'Villa', 'villa', 'a_louer', 500000, 'Abidjan', 'SRID=4326;POINT(-3.99 5.36)', false),
  ('cafe1111-0000-0000-0000-000000000004', 'cafe0000-0000-0000-0000-000000000001', 'Terrain 500 m²', 'terrain', 'a_vendre', 25000000, 'Abidjan', 'SRID=4326;POINT(-3.99 5.36)', false);

create function pg_temp.ids(sql text) returns text[]
language plpgsql as $$
declare r text[];
begin
  execute 'select array_agg(right(s.id::text, 1) order by right(s.id::text, 1)) from (' || sql || ') s'
     || ' where s.id::text like ''cafe1111%''' into r;
  return r;
end;
$$;
grant execute on function pg_temp.ids(text) to anon;

set local role anon;

select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_types => array['hotel', 'auberge']::public.property_type_keyli[]) $q$),
          array['1', '2'], 'Hôtels & auberges : les deux types, pas la villa ni le terrain');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_types => '{}') $q$),
          array['1', '2', '3', '4'], 'Liste de types vide : tous les types');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_types => array['hotel', 'auberge']::public.property_type_keyli[], p_type => 'auberge') $q$),
          array['2'], 'p_type et p_types se cumulent');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_type => 'terrain', p_statut => 'a_vendre') $q$),
          array['4'], 'Carte « Terrains » : le terrain en vente');
select is((select type::text from public.rechercher_annonces_keyli(p_type => 'terrain') where id = 'cafe1111-0000-0000-0000-000000000004'),
          'terrain', 'Le type terrain est renvoyé tel quel');

select * from finish();
rollback;
