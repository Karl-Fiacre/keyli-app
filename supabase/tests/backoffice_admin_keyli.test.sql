-- Tests du back-office admin (file de vérification, modération,
-- indicateurs) — exécutés par `npm run db:test` (pgTAP), en local, en CI et
-- sur le projet distant (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(19);

-- M admin ; O propriétaire avec une annonce ; A agence ; C chercheur
insert into auth.users (id, email, raw_user_meta_data) values
  ('adad0000-0000-0000-0000-00000000000e', 'm@test.local', '{"first_name": "Moussa", "last_name": "Admin"}'),
  ('adad0000-0000-0000-0000-00000000000a', 'o@test.local', '{"role_keyli": "owner", "first_name": "Yao", "last_name": "Kouadio"}'),
  ('adad0000-0000-0000-0000-00000000000b', 'a@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Lagune"}'),
  ('adad0000-0000-0000-0000-00000000000c', 'c@test.local', '{"first_name": "Aminata", "last_name": "Diallo"}');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'adad0000-0000-0000-0000-00000000000e';
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'adad0000-0000-0000-0000-00000000000a', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';
insert into public.properties_keyli (id, owner_id, title, type, status, price, city, geolocation)
values ('adad1111-0000-0000-0000-000000000001', 'adad0000-0000-0000-0000-00000000000a', 'Villa Bingerville',
        'villa', 'a_louer', 500000, 'Abidjan', 'SRID=4326;POINT(-3.89 5.35)');

-- Documents déposés (du plus ancien au plus récent)
insert into public.documents_keyli (user_id, doc_type, file_url, created_at) values
  ('adad0000-0000-0000-0000-00000000000a', 'extrait_naissance', 'adad0000-0000-0000-0000-00000000000a/extrait.pdf', now() - interval '3 hours'),
  ('adad0000-0000-0000-0000-00000000000a', 'cert_residence', 'adad0000-0000-0000-0000-00000000000a/certificat.pdf', now() - interval '2 hours'),
  ('adad0000-0000-0000-0000-00000000000b', 'registre', 'adad0000-0000-0000-0000-00000000000b/registre.pdf', now() - interval '1 hour');

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- ------------------------------------------------------------
-- Réservé aux admins
-- ------------------------------------------------------------
select pg_temp.connecter('adad0000-0000-0000-0000-00000000000c');
select throws_ok($$ select * from public.admin_file_verification_keyli() $$, '42501', null,
  'Un chercheur n''accède pas à la file de vérification');
select throws_ok($$ select * from public.admin_file_signalements_keyli() $$, '42501', null,
  'Un chercheur n''accède pas à la file de modération');
select throws_ok($$ select * from public.admin_indicateurs_keyli() $$, '42501', null,
  'Un chercheur n''accède pas aux indicateurs');

-- ------------------------------------------------------------
-- Signalements (côté utilisateur)
-- ------------------------------------------------------------
select lives_ok($$ insert into public.reports_keyli (reporter_id, property_id, motif)
  values ('adad0000-0000-0000-0000-00000000000c', 'adad1111-0000-0000-0000-000000000001', 'fraude') $$,
  'Signalement avec un motif de la liste, sans précision');
select pg_temp.connecter('adad0000-0000-0000-0000-00000000000b');
select throws_ok($$ insert into public.reports_keyli (reporter_id, property_id, motif)
  values ('adad0000-0000-0000-0000-00000000000b', 'adad1111-0000-0000-0000-000000000001', 'autre') $$,
  '23514', null, 'Motif « autre » : précision obligatoire');
select throws_ok($$ insert into public.reports_keyli (reporter_id, property_id, motif, reason)
  values ('adad0000-0000-0000-0000-00000000000b', 'adad1111-0000-0000-0000-000000000001', 'spam', 'x') $$,
  '23514', null, 'Motif hors liste refusé');
select throws_ok($$ insert into public.reports_keyli (reporter_id, property_id, motif, reason)
  values ('adad0000-0000-0000-0000-00000000000b', 'adad1111-0000-0000-0000-000000000001', 'indisponible', repeat('x', 1001)) $$,
  '23514', null, 'Précision limitée à 1 000 caractères');

-- ------------------------------------------------------------
-- File de vérification (admin)
-- ------------------------------------------------------------
select pg_temp.connecter('adad0000-0000-0000-0000-00000000000e');
select results_eq(
  $$ select doc_type::text, nom, role::text from public.admin_file_verification_keyli() $$,
  $$ values ('extrait_naissance'::text, 'Yao Kouadio'::text, 'owner'::text),
            ('cert_residence', 'Yao Kouadio', 'owner'),
            ('registre', 'Agence Lagune', 'agency') $$,
  'File de vérification : documents en attente, les plus anciens d''abord, avec le déposant');

select lives_ok($$ select public.admin_reviser_document_keyli(
  (select id from public.documents_keyli where doc_type = 'extrait_naissance'), 'approved') $$,
  'L''admin approuve l''extrait de naissance');
select lives_ok($$ select public.admin_reviser_document_keyli(
  (select id from public.documents_keyli where doc_type = 'cert_residence'), 'rejected', 'Document illisible.') $$,
  'L''admin rejette le certificat avec un motif');
select results_eq($$ select doc_type::text from public.admin_file_verification_keyli('approved') $$,
  $$ values ('extrait_naissance'::text) $$, 'Les documents traités se consultent par statut');

select pg_temp.connecter('adad0000-0000-0000-0000-00000000000a');
select results_eq(
  $$ select type, contenu from public.notifications_keyli order by type $$,
  $$ values ('document_approuve'::text, 'Votre extrait de naissance a été approuvé par l''équipe Keyli.'::text),
            ('document_rejete', 'Votre certificat de résidence n''a pas pu être validé : Document illisible. Vous pouvez en déposer un nouveau.') $$,
  'Le déposant est notifié de chaque décision, avec le motif du rejet');
select is((select verified from public.profiles_keyli where user_id = (select auth.uid())), false,
  'Compte propriétaire non vérifié tant que les deux pièces ne sont pas approuvées');

-- ------------------------------------------------------------
-- Modération (admin)
-- ------------------------------------------------------------
select pg_temp.connecter('adad0000-0000-0000-0000-00000000000e');
select results_eq(
  $$ select motif, titre_bien, annonceur, auteur, signalements_en_attente from public.admin_file_signalements_keyli() $$,
  $$ values ('fraude'::text, 'Villa Bingerville'::text, 'Yao Kouadio'::text, 'Aminata Diallo'::text, 1::bigint) $$,
  'File de modération : motif, annonce, annonceur, auteur, signalements en attente sur l''annonce');
select lives_ok($$ select public.admin_traiter_signalement_keyli(
  (select id from public.reports_keyli limit 1), 'resolved', 'Annonce vérifiée sur place') $$,
  'L''admin traite le signalement');
select is((select count(*)::int from public.admin_file_signalements_keyli()), 0, 'Plus rien en attente');
select is((select count(*)::int from public.admin_file_signalements_keyli('resolved')), 1, 'Le signalement traité reste consultable');

-- ------------------------------------------------------------
-- Indicateurs (admin)
-- ------------------------------------------------------------
select results_eq(
  $$ select proprietaires, agences, annonceurs_verifies, taux_verification, annonces_publiees, annonces_visibles,
            documents_en_attente, signalements_en_attente, abonnements_actifs
       from public.admin_indicateurs_keyli() $$,
  $$ values (1::bigint, 1::bigint, 0::bigint, 0.0::numeric, 1::bigint, 1::bigint, 1::bigint, 0::bigint, 1::bigint) $$,
  'Indicateurs : comptes, vérification, annonces, files en attente, abonnements');
select is((select note_moyenne from public.admin_indicateurs_keyli()), null::numeric, 'Pas encore d''avis : note moyenne vide');

select * from finish();
rollback;
