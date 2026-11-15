-- Tests du pilote national (migration 20261120120000) — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(16);

-- Gratuité active pendant le test, plafond ramené à 2 pour l'essai
update public.pilote_gratuite_keyli
   set debut = now() - interval '1 day', fin = now() + interval '1 day', plafond = 2;

-- N : propriétaire sans abonnement ; A : agence sans registre ;
-- S : propriétaire abonné (forfait Propriétaire, seuil 4)
insert into auth.users (id, email, raw_user_meta_data) values
  ('d1d10000-0000-0000-0000-000000000001', 'n@pilote.local', '{"role_keyli": "owner"}'),
  ('d1d10000-0000-0000-0000-000000000002', 'a@pilote.local', '{"role_keyli": "agency", "nom_agence": "Agence Pilote"}'),
  ('d1d10000-0000-0000-0000-000000000003', 's@pilote.local', '{"role_keyli": "owner"}');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'd1d10000-0000-0000-0000-000000000003', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';

select set_config('test.bouake', (select q.id::text from public.quartiers_keyli q where q.nom = 'Bouaké Centre'), true);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.connecter(text) to authenticated;

create function pg_temp.publier(titre text) returns void
language sql as $$
  insert into public.properties_keyli (owner_id, title, type, status, price, city, quartier_id, geolocation)
  values ((select auth.uid()), titre, 'appartement', 'a_louer', 80000, 'Abidjan',
          current_setting('test.bouake')::uuid, 'SRID=4326;POINT(-5.03 7.69)');
$$;
grant execute on function pg_temp.publier(text) to authenticated;

-- ------------------------------------------------------------
-- Villes
-- ------------------------------------------------------------
select is((select array_agg(ville order by ville) from public.communes_keyli
            where nom in ('Bouaké', 'San-Pédro', 'Yamoussoukro')),
          array['Bouaké', 'San-Pédro', 'Yamoussoukro'], 'Les trois villes de la vague 2 existent');
select is((select ville from public.communes_keyli where nom = 'Cocody'), 'Abidjan',
          'Les communes existantes restent à Abidjan');
select is((select count(*)::integer from public.quartiers_keyli q join public.communes_keyli c on c.id = q.commune_id
            where c.ville in ('Bouaké', 'San-Pédro', 'Yamoussoukro')), 3, 'Un quartier « Centre » par nouvelle ville');

-- ------------------------------------------------------------
-- Propriétaire sans abonnement pendant le pilote
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('d1d10000-0000-0000-0000-000000000001');

select is((select statut from public.etat_publication_keyli()), 'gratuite_pilote', 'Sans abonnement : publication gratuite');
select lives_ok($q$ select pg_temp.publier('Gratuite 1') $q$, 'Première annonce gratuite');
select is((select city from public.properties_keyli where title = 'Gratuite 1'), 'Bouaké',
          'La ville vient du quartier, pas du formulaire (« Abidjan » envoyé)');
select lives_ok($q$ select pg_temp.publier('Gratuite 2') $q$, 'Deuxième annonce gratuite');
select is((select statut from public.etat_publication_keyli()), 'plafond_pilote', 'Plafond atteint');
select throws_ok($q$ select pg_temp.publier('Gratuite 3') $q$, 'KY005', null, 'Au-delà du plafond : refus KY005');

-- Archiver une annonce libère une place
update public.properties_keyli set archived_at = now() where title = 'Gratuite 2';
select is((select statut from public.etat_publication_keyli()), 'gratuite_pilote', 'Archiver libère une place');

-- La ville ne peut pas être forcée par le client
update public.properties_keyli set city = 'Paris' where title = 'Gratuite 1';
select is((select city from public.properties_keyli where title = 'Gratuite 1'), 'Bouaké', 'Ville non modifiable à la main');

-- ------------------------------------------------------------
-- Agence sans registre : la vérification reste exigée
-- ------------------------------------------------------------
select pg_temp.connecter('d1d10000-0000-0000-0000-000000000002');
select throws_ok($q$ select pg_temp.publier('Agence') $q$, 'KY004', null, 'Agence : registre toujours requis pendant le pilote');

-- ------------------------------------------------------------
-- Abonné : gratuit d'abord, puis son forfait au-delà du plafond ; les
-- mises en ligne gratuites ne comptent pas dans le forfait
-- ------------------------------------------------------------
select pg_temp.connecter('d1d10000-0000-0000-0000-000000000003');
select pg_temp.publier('Abonne 1');
select pg_temp.publier('Abonne 2');
select is((select statut from public.etat_publication_keyli()), 'incluse', 'Abonné au plafond : son forfait prend le relais');
select is((select publications_cycle from public.etat_publication_keyli()), 0,
          'Les annonces gratuites ne comptent pas dans le forfait');

-- ------------------------------------------------------------
-- Après le pilote (option A) : les annonces restent en ligne, toute
-- nouvelle publication suit de nouveau les forfaits
-- ------------------------------------------------------------
set local role postgres;
update public.pilote_gratuite_keyli set debut = now() - interval '2 days', fin = now() - interval '1 day';
set local role authenticated;
select pg_temp.connecter('d1d10000-0000-0000-0000-000000000001');
select throws_ok($q$ select pg_temp.publier('Après pilote') $q$, 'KY001', null, 'Après le pilote : abonnement de nouveau requis');
select is((select count(*)::integer from public.properties_keyli
            where owner_id = 'd1d10000-0000-0000-0000-000000000001' and archived_at is null), 1,
          'Les annonces gratuites restent en ligne après le pilote');

select * from finish();
rollback;
