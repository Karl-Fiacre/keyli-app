-- Tests de la recherche par rayon (migration 20261119120000) — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(9);

-- P : agence abonnée (Grande Agence pour ne pas buter sur le seuil)
insert into auth.users (id, email, raw_user_meta_data) values
  ('cece0000-0000-0000-0000-000000000001', 'rayon@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Rayon"}');
insert into public.documents_keyli (user_id, doc_type, file_url, status)
values ('cece0000-0000-0000-0000-000000000001', 'registre', 'cece/registre.pdf', 'approved');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'cece0000-0000-0000-0000-000000000001', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'grande_agence';

select set_config('test.angre', (select q.id::text from public.quartiers_keyli q where q.nom = 'Angré'), true);
select set_config('test.yop', (select q.id::text from public.quartiers_keyli q where q.nom = 'Yopougon Centre'), true);

-- Angré (1, 2) et Yopougon (3), à environ 12 km l'un de l'autre ; 4 archivée
insert into public.properties_keyli (id, owner_id, title, type, status, price, city, quartier_id, geolocation, rooms)
values
  ('cece1111-0000-0000-0000-000000000001', 'cece0000-0000-0000-0000-000000000001', 'Appart Angré', 'appartement', 'a_louer', 250000, 'Abidjan', current_setting('test.angre')::uuid, 'SRID=4326;POINT(-3.9880 5.3950)', 3),
  ('cece1111-0000-0000-0000-000000000002', 'cece0000-0000-0000-0000-000000000001', 'Studio Angré', 'studio', 'a_louer', 120000, 'Abidjan', current_setting('test.angre')::uuid, 'SRID=4326;POINT(-3.9900 5.3940)', 1),
  ('cece1111-0000-0000-0000-000000000003', 'cece0000-0000-0000-0000-000000000001', 'Villa Yopougon', 'villa', 'a_vendre', 60000000, 'Abidjan', current_setting('test.yop')::uuid, 'SRID=4326;POINT(-4.0800 5.3450)', 5),
  ('cece1111-0000-0000-0000-000000000004', 'cece0000-0000-0000-0000-000000000001', 'Ancienne Angré', 'studio', 'a_louer', 90000, 'Abidjan', current_setting('test.angre')::uuid, 'SRID=4326;POINT(-3.9880 5.3950)', 1);
update public.properties_keyli set archived_at = now() where id = 'cece1111-0000-0000-0000-000000000004';

create function pg_temp.ids(sql text) returns text[]
language plpgsql as $$
declare r text[];
begin
  execute 'select array_agg(right(s.id::text, 1) order by right(s.id::text, 1)) from (' || sql || ') s'
     || ' where s.id::text like ''cece1111%''' into r;
  return r;
end;
$$;
grant execute on function pg_temp.ids(text) to anon;

-- ------------------------------------------------------------
-- Visiteur anonyme, depuis Angré
-- ------------------------------------------------------------
set local role anon;

select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_lat => 5.395, p_lng => -3.988, p_rayon_km => 3) $q$),
          array['1', '2'], 'Rayon de 3 km autour d''Angré : les annonces d''Angré, pas Yopougon ni l''archivée');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_lat => 5.395, p_lng => -3.988, p_rayon_km => 20) $q$),
          array['1', '2', '3'], 'Rayon de 20 km : Yopougon aussi');
select is(pg_temp.ids($q$ select * from public.rechercher_annonces_keyli(p_lat => 5.395, p_lng => -3.988, p_rayon_km => 3, p_type => 'studio') $q$),
          array['2'], 'Les autres filtres restent cumulés au rayon');
select is(pg_temp.ids(format($q$ select * from public.rechercher_annonces_keyli(p_lat => 5.395, p_lng => -3.988, p_rayon_km => 3, p_quartier => %L) $q$,
                             current_setting('test.yop'))),
          array['1', '2'], 'Le rayon remplace le filtre quartier');

select ok((select bool_and(distance_km >= 0.5 and distance_km * 2 = round(distance_km * 2))
             from public.rechercher_annonces_keyli(p_lat => 5.395, p_lng => -3.988, p_rayon_km => 20)
            where id::text like 'cece1111%'),
          'Distance arrondie au demi-kilomètre, 0,5 km au minimum');
select ok((select distance_km between 10 and 14
             from public.rechercher_annonces_keyli(p_lat => 5.395, p_lng => -3.988, p_rayon_km => 20)
            where id = 'cece1111-0000-0000-0000-000000000003'),
          'Distance Angré → Yopougon plausible (environ 12 km)');
select ok((select bool_and(distance_km is null)
             from public.rechercher_annonces_keyli(p_limite => 50)
            where id::text like 'cece1111%'),
          'Sans rayon, pas de distance');

-- La fonction d'appoint ne renvoie qu'un identifiant et une distance arrondie
select is((select pg_get_function_result(f.oid) from pg_proc f where f.proname = 'annonces_autour_keyli'),
          'TABLE(id uuid, distance_km numeric)', 'annonces_autour_keyli ne renvoie jamais de position');

-- Le client ne lit toujours pas la position exacte
select throws_ok($q$ select geolocation from public.properties_keyli limit 1 $q$, '42501', null,
                 'La position exacte reste illisible pour un visiteur');

select * from finish();
rollback;
