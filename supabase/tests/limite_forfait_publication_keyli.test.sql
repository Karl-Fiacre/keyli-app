-- Tests de la limite du forfait à la publication — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(26);

-- ------------------------------------------------------------
-- Comptes :
--   P  propriétaire, forfait Propriétaire (seuil 4, 1 500 XOF)
--   M  agence, forfait Agence Moyenne (seuil 10, pas de dépassement)
--   G  agence, Grande Agence avec prix négocié 700 XOF
--   H  agence, Grande Agence avec montant mensuel négocié
--   N  propriétaire sans abonnement
--   X  propriétaire dont l'abonnement est expiré (date dépassée)
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}'),
  ('11111111-0000-0000-0000-000000000002', 'm@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Test"}'),
  ('11111111-0000-0000-0000-000000000003', 'g@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Test"}'),
  ('11111111-0000-0000-0000-000000000004', 'h@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Test"}'),
  ('11111111-0000-0000-0000-000000000005', 'n@test.local', '{"role_keyli": "owner"}'),
  ('11111111-0000-0000-0000-000000000006', 'x@test.local', '{"role_keyli": "owner"}');

insert into public.subscriptions_keyli
  (user_id, plan_id, amount, start_date, end_date, prix_depassement_negocie, montant_depassement_negocie)
select u.id, p.id, p.prix_mensuel, u.debut, u.debut + interval '1 month', u.prix_nego, u.montant_nego
  from (values
    ('11111111-0000-0000-0000-000000000001'::uuid, 'proprietaire',   now() - interval '1 day',   null::numeric, null::numeric),
    ('11111111-0000-0000-0000-000000000002'::uuid, 'agence_moyenne', now() - interval '1 day',   null, null),
    ('11111111-0000-0000-0000-000000000003'::uuid, 'grande_agence',  now() - interval '1 day',   700,  null),
    ('11111111-0000-0000-0000-000000000004'::uuid, 'grande_agence',  now() - interval '1 day',   null, 40000),
    ('11111111-0000-0000-0000-000000000006'::uuid, 'proprietaire',   now() - interval '2 months', null, null)
  ) as u(id, code, debut, prix_nego, montant_nego)
  join public.plans_keyli p on p.code = u.code;

-- Registre de commerce approuvé : obligatoire pour qu'une agence publie
-- (migration 20261002190000_admin_backoffice_keyli.sql)
insert into public.documents_keyli (user_id, doc_type, file_url, status)
select id, 'registre', id::text || '/registre.pdf', 'approved'
  from unnest(array['11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000004']::uuid[]) as id;

-- Publie n annonces pour le compte connecté (accord de dépassement optionnel)
create function pg_temp.publier(n integer, accord boolean default false) returns void
language sql as $$
  insert into public.properties_keyli
    (owner_id, title, type, status, price, city, geolocation, accepte_depassement)
  select (select auth.uid()), 'Annonce ' || g, 'appartement', 'a_louer', 100000, 'Abidjan',
         'SRID=4326;POINT(-4.0 5.3)', accord
    from generate_series(1, n) g;
$$;
grant execute on function pg_temp.publier(integer, boolean) to authenticated;

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.connecter(text) to authenticated;

-- ------------------------------------------------------------
-- Structure
-- ------------------------------------------------------------
select has_table('public', 'property_publications_keyli', 'Le journal des mises en ligne existe');
select is(
  (select relrowsecurity from pg_class where oid = 'public.property_publications_keyli'::regclass),
  true,
  'RLS est activée sur property_publications_keyli'
);

set local role authenticated;

-- ------------------------------------------------------------
-- P : forfait Propriétaire (4 incluses, puis 1 500 XOF avec accord)
-- ------------------------------------------------------------
select pg_temp.connecter('11111111-0000-0000-0000-000000000001');

select lives_ok($$ select pg_temp.publier(4) $$, 'Propriétaire : 4 annonces incluses dans le forfait');
select results_eq(
  $$ select statut, publications_cycle, prix_depassement from public.etat_publication_keyli() $$,
  $$ values ('depassement'::text, 4, 1500.00::decimal(10,2)) $$,
  'L''état du forfait annonce un dépassement à 1 500 XOF pour la suivante'
);
select throws_ok($$ select pg_temp.publier(1) $$, 'KY003', null,
  'Propriétaire : la 5e annonce est refusée sans accord de dépassement');
select lives_ok($$ select pg_temp.publier(1, true) $$,
  'Propriétaire : la 5e annonce passe avec l''accord explicite');
select results_eq(
  $$ select hors_forfait, prix_depassement from public.property_publications_keyli
      order by published_at desc, prix_depassement nulls last limit 1 $$,
  $$ values (true, 1500.00::decimal(10,2)) $$,
  'Le dépassement est enregistré à 1 500 XOF pour la facturation'
);
select results_eq(
  $$ select count(*)::int from public.properties_keyli where accepte_depassement $$,
  $$ values (0) $$,
  'L''accord de dépassement n''est jamais conservé'
);
select throws_ok($$ select pg_temp.publier(1) $$, 'KY003', null,
  'Un accord ne vaut que pour une publication : la 6e en redemande un');

-- Archivage puis republication : compte comme une nouvelle annonce
select lives_ok(
  $$ update public.properties_keyli set archived_at = now() where title = 'Annonce 1' and accepte_depassement = false
       and id = (select id from public.properties_keyli where title = 'Annonce 1' order by created_at limit 1) $$,
  'Propriétaire : archivage d''une annonce'
);
select results_eq(
  $$ select publications_cycle from public.etat_publication_keyli() $$,
  $$ values (5) $$,
  'Une annonce archivée dans le cycle reste comptée'
);
select throws_ok(
  $$ update public.properties_keyli set archived_at = null
      where id = (select id from public.properties_keyli where archived_at is not null limit 1) $$,
  'KY003', null,
  'Republier une annonce archivée compte comme nouvelle (accord requis)'
);
select lives_ok(
  $$ update public.properties_keyli set archived_at = null, accepte_depassement = true
      where id = (select id from public.properties_keyli where archived_at is not null limit 1) $$,
  'La republication passe avec l''accord'
);
select results_eq(
  $$ select publications_cycle from public.etat_publication_keyli() $$,
  $$ values (6) $$,
  'La republication est comptée comme une 6e mise en ligne du cycle'
);

-- ------------------------------------------------------------
-- M : Agence Moyenne (10, puis blocage)
-- ------------------------------------------------------------
select pg_temp.connecter('11111111-0000-0000-0000-000000000002');

select lives_ok($$ select pg_temp.publier(10) $$, 'Agence Moyenne : 10 annonces incluses');
select throws_ok($$ select pg_temp.publier(1) $$, 'KY002', null,
  'Agence Moyenne : la 11e annonce est bloquée');
select throws_ok($$ select pg_temp.publier(1, true) $$, 'KY002', null,
  'Agence Moyenne : même avec accord, pas de dépassement (montée de gamme)');

-- ------------------------------------------------------------
-- G : Grande Agence, prix négocié 700 XOF au-delà de 30
-- ------------------------------------------------------------
select pg_temp.connecter('11111111-0000-0000-0000-000000000003');

select lives_ok($$ select pg_temp.publier(30) $$, 'Grande Agence : 30 annonces incluses');
select throws_ok($$ select pg_temp.publier(1) $$, 'KY003', null,
  'Grande Agence : la 31e demande un accord');
select results_eq(
  $$ select prix_depassement from public.etat_publication_keyli() $$,
  $$ values (700.00::decimal(10,2)) $$,
  'Grande Agence : le prix négocié remplace les 1 000 XOF'
);

-- ------------------------------------------------------------
-- H : Grande Agence, montant mensuel négocié (couverte sans accord)
-- ------------------------------------------------------------
select pg_temp.connecter('11111111-0000-0000-0000-000000000004');

select lives_ok($$ select pg_temp.publier(31) $$,
  'Grande Agence avec montant négocié : la 31e passe sans accord à l''unité');
select results_eq(
  $$ select count(*)::int from public.property_publications_keyli
      where hors_forfait and prix_depassement is null $$,
  $$ values (1) $$,
  'Elle est marquée hors forfait, couverte par le montant négocié'
);

-- ------------------------------------------------------------
-- N sans abonnement, X abonnement expiré
-- ------------------------------------------------------------
select pg_temp.connecter('11111111-0000-0000-0000-000000000005');
select throws_ok($$ select pg_temp.publier(1) $$, 'KY001', null,
  'Sans abonnement, pas de publication');

select pg_temp.connecter('11111111-0000-0000-0000-000000000006');
select throws_ok($$ select pg_temp.publier(1) $$, 'KY001', null,
  'Abonnement dont la date de fin est passée : pas de publication');

-- ------------------------------------------------------------
-- Accès au journal et aux fonctions
-- ------------------------------------------------------------
select pg_temp.connecter('11111111-0000-0000-0000-000000000001');
select throws_ok(
  $$ insert into public.property_publications_keyli (property_id, owner_id)
     select id, owner_id from public.properties_keyli limit 1 $$,
  '42501', null,
  'Un utilisateur ne peut pas écrire dans le journal des mises en ligne'
);
select throws_ok(
  $$ select * from public.evaluer_publication_keyli('11111111-0000-0000-0000-000000000003') $$,
  '42501', null,
  'Un utilisateur ne peut pas sonder le forfait d''un autre compte'
);

set local role postgres;
select * from finish();
rollback;
