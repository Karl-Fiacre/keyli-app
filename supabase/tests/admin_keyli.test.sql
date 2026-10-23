-- Tests du module admin (fondations + back-office) — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin : aucune donnée ne subsiste.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(47);

-- ------------------------------------------------------------
-- Comptes : SA super_admin, AD admin, P propriétaire, A agence, C chercheur
-- (admin et super_admin attribués en SQL direct, seul chemin prévu)
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-0000-0000-0000-00000000005a', 'sa@test.local', '{}'),
  ('33333333-0000-0000-0000-0000000000ad', 'ad@test.local', '{}'),
  ('33333333-0000-0000-0000-000000000001', 'p@test.local', '{"role_keyli": "owner"}'),
  ('33333333-0000-0000-0000-000000000002', 'a@test.local', '{"role_keyli": "agency", "nom_agence": "Agence Test"}'),
  ('33333333-0000-0000-0000-000000000003', 'c@test.local', '{}');
update public.profiles_keyli set role_keyli = 'super_admin' where user_id = '33333333-0000-0000-0000-00000000005a';
update public.profiles_keyli set role_keyli = 'admin'       where user_id = '33333333-0000-0000-0000-0000000000ad';

insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select u.id, p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from (values ('33333333-0000-0000-0000-000000000001'::uuid, 'proprietaire'),
               ('33333333-0000-0000-0000-000000000002'::uuid, 'agence_moyenne')) as u(id, code)
  join public.plans_keyli p on p.code = u.code;

insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
  values ('33333333-0000-0000-0000-000000000001', 'Villa P', 'villa', 'a_louer', 1, 'Abidjan', 'SRID=4326;POINT(-3.96 5.36)');

insert into public.documents_keyli (user_id, property_id, doc_type, file_url) values
  ('33333333-0000-0000-0000-000000000001', null, 'extrait_naissance', '33333333-0000-0000-0000-000000000001/extrait.pdf'),
  ('33333333-0000-0000-0000-000000000001', null, 'cert_residence',   '33333333-0000-0000-0000-000000000001/residence.pdf'),
  ('33333333-0000-0000-0000-000000000001', (select id from public.properties_keyli where title = 'Villa P'),
   'acd', '33333333-0000-0000-0000-000000000001/acd.pdf'),
  ('33333333-0000-0000-0000-000000000002', null, 'registre', '33333333-0000-0000-0000-000000000002/registre.pdf');

insert into public.reports_keyli (reporter_id, property_id, reason)
  values ('33333333-0000-0000-0000-000000000003', (select id from public.properties_keyli where title = 'Villa P'), 'Prix suspect');

select set_config('test.doc_extrait',  (select id::text from public.documents_keyli where doc_type = 'extrait_naissance'), true);
select set_config('test.doc_cert',     (select id::text from public.documents_keyli where doc_type = 'cert_residence'), true);
select set_config('test.doc_acd',      (select id::text from public.documents_keyli where doc_type = 'acd'), true);
select set_config('test.doc_registre', (select id::text from public.documents_keyli where doc_type = 'registre'), true);
select set_config('test.report',       (select id::text from public.reports_keyli limit 1), true);
select set_config('test.plan_proprio', (select id::text from public.plans_keyli where code = 'proprietaire'), true);
select set_config('test.sub_agence',   (select id::text from public.subscriptions_keyli
                                         where user_id = '33333333-0000-0000-0000-000000000002'), true);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select is(
  (select relrowsecurity from pg_class where oid = 'public.audit_logs_keyli'::regclass),
  true,
  'RLS est activée sur audit_logs_keyli'
);

set local role authenticated;

-- ------------------------------------------------------------
-- Non-administrateur
-- ------------------------------------------------------------
select pg_temp.connecter('33333333-0000-0000-0000-000000000003');  -- C
select throws_ok(
  $$ select public.admin_reviser_document_keyli(current_setting('test.doc_extrait')::uuid, 'approved') $$,
  '42501', null,
  'Un utilisateur ordinaire ne valide pas de document'
);
select results_eq($$ select count(*)::int from public.audit_logs_keyli $$, $$ values (0) $$,
  'Un utilisateur ordinaire ne lit pas le journal d''audit');

-- ------------------------------------------------------------
-- Agence A : sans registre approuvé, pas de publication
-- ------------------------------------------------------------
select pg_temp.connecter('33333333-0000-0000-0000-000000000002');  -- A
select throws_ok(
  $$ insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
     values ('33333333-0000-0000-0000-000000000002', 'Bureau A', 'bureau', 'a_louer', 1, 'Abidjan', 'SRID=4326;POINT(-4 5.3)') $$,
  'KY004', null,
  'Une agence sans registre approuvé ne publie pas'
);
select results_eq($$ select statut from public.etat_publication_keyli() $$, $$ values ('registre_requis'::text) $$,
  'L''état de publication de l''agence indique le registre requis');

-- ------------------------------------------------------------
-- Admin AD : revue des documents et signalements
-- ------------------------------------------------------------
select pg_temp.connecter('33333333-0000-0000-0000-0000000000ad');  -- AD
select results_eq($$ select count(*)::int from public.documents_keyli $$, $$ values (4) $$,
  'L''admin lit tous les documents');
select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'documents_keyli' $$,
  $$ values (0) $$,
  'L''admin a accès au bucket des pièces (aucun fichier réel dans ce test)'
);
select lives_ok($$ select public.admin_reviser_document_keyli(current_setting('test.doc_extrait')::uuid, 'approved') $$,
  'L''admin approuve l''extrait de naissance');
select is((select verified from public.profiles_keyli where user_id = '33333333-0000-0000-0000-000000000001'), false,
  'Extrait seul : le propriétaire n''est pas encore vérifié');
select lives_ok($$ select public.admin_reviser_document_keyli(current_setting('test.doc_cert')::uuid, 'approved') $$,
  'L''admin approuve le certificat de résidence');
select is((select verified from public.profiles_keyli where user_id = '33333333-0000-0000-0000-000000000001'), true,
  'Extrait ET certificat : le propriétaire est vérifié');
select throws_ok($$ select public.admin_reviser_document_keyli(current_setting('test.doc_acd')::uuid, 'rejected') $$,
  '23514', null, 'Un rejet sans commentaire est refusé');
select lives_ok($$ select public.admin_reviser_document_keyli(current_setting('test.doc_acd')::uuid, 'approved') $$,
  'L''admin approuve l''ACD du bien');
select is((select is_verified from public.properties_keyli where title = 'Villa P'), true,
  'ACD approuvé : le bien est vérifié');
select throws_ok($$ select public.admin_reviser_document_keyli(current_setting('test.doc_acd')::uuid, 'rejected', 'Revirement') $$,
  '23514', null, 'Un document déjà traité ne se révise pas');
select lives_ok($$ select public.admin_reviser_document_keyli(current_setting('test.doc_registre')::uuid, 'approved') $$,
  'L''admin approuve le registre de l''agence');
select is((select verified from public.profiles_keyli where user_id = '33333333-0000-0000-0000-000000000002'), true,
  'Registre approuvé : l''agence est vérifiée');
select lives_ok($$ select public.admin_traiter_signalement_keyli(current_setting('test.report')::uuid, 'resolved', 'Prix confirmé') $$,
  'L''admin traite un signalement');
select throws_ok($$ select public.super_admin_changer_role_keyli('33333333-0000-0000-0000-000000000003', 'admin') $$,
  '42501', null, 'Un admin ne nomme pas d''admin');
select throws_ok($$ select public.super_admin_modifier_forfait_keyli(current_setting('test.plan_proprio')::uuid, 1, 1, 4, 1, true) $$,
  '42501', null, 'Un admin ne modifie pas les forfaits');
select results_eq(
  $$ select count(*)::int from public.audit_logs_keyli where admin_id = (select auth.uid()) $$,
  $$ values (5) $$,
  'Chaque action de l''admin est journalisée (5 entrées)'
);
select throws_ok($$ update public.audit_logs_keyli set action = 'effacé' $$, '42501', null,
  'Une entrée d''audit ne se modifie pas');
select throws_ok($$ delete from public.audit_logs_keyli $$, '42501', null,
  'Une entrée d''audit ne se supprime pas');

-- Agence A, désormais vérifiée, publie
select pg_temp.connecter('33333333-0000-0000-0000-000000000002');  -- A
select lives_ok(
  $$ insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
     values ('33333333-0000-0000-0000-000000000002', 'Bureau A', 'bureau', 'a_louer', 1, 'Abidjan', 'SRID=4326;POINT(-4 5.3)') $$,
  'Avec son registre approuvé, l''agence publie'
);

-- ------------------------------------------------------------
-- Super admin SA
-- ------------------------------------------------------------
select pg_temp.connecter('33333333-0000-0000-0000-00000000005a');  -- SA
select lives_ok($$ select public.super_admin_changer_role_keyli('33333333-0000-0000-0000-000000000003', 'admin') $$,
  'Le super_admin nomme un admin');
select is((select role_keyli::text from public.profiles_keyli where user_id = '33333333-0000-0000-0000-000000000003'), 'admin',
  'Le rôle admin est bien attribué');
select throws_ok($$ select public.super_admin_changer_role_keyli('33333333-0000-0000-0000-000000000003', 'super_admin') $$,
  '42501', null, 'Le rôle super_admin ne s''attribue pas par l''API');
select throws_ok($$ select public.super_admin_changer_role_keyli('33333333-0000-0000-0000-00000000005a', 'user') $$,
  '42501', null, 'Le super_admin ne change pas son propre rôle');
select lives_ok($$ select public.super_admin_modifier_forfait_keyli(current_setting('test.plan_proprio')::uuid, 6000, 1, 4, 1500, true) $$,
  'Le super_admin modifie le prix d''un forfait');
select is((select prix_mensuel from public.plans_keyli where code = 'proprietaire'), 6000.00::numeric,
  'Le nouveau prix est enregistré');
select throws_ok($$ select public.super_admin_modifier_forfait_keyli(current_setting('test.plan_proprio')::uuid, 6000, 5, 4, 1500, true) $$,
  '22023', null, 'Des seuils incohérents sont refusés');
select throws_ok($$ select public.super_admin_formule_negociee_keyli(current_setting('test.sub_agence')::uuid, 500, null, 'Essai') $$,
  '23514', null, 'Pas de formule négociée hors Grande Agence');
select results_eq(
  $$ select count(distinct admin_id)::int from public.audit_logs_keyli $$,
  $$ values (2) $$,
  'Le super_admin lit tout le journal, actions des admins comprises'
);

-- ------------------------------------------------------------
-- Back-office : visiteur anonyme
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select lives_ok(
  $$ insert into public.inscription_pilot_keyli (email, first_name, property_type) values ('pilote@test.local', 'Awa', 'villa') $$,
  'Un visiteur s''inscrit au pilote'
);
select throws_ok($$ select * from public.inscription_pilot_keyli $$, '42501', null,
  'Un visiteur ne lit pas les inscriptions pilote');
select throws_ok(
  $$ insert into public.inscription_pilot_keyli (email, status) values ('vip@test.local', 'converti') $$,
  '42501', null, 'Un visiteur ne choisit pas le statut de son inscription'
);
select lives_ok(
  $$ insert into public.signup_attempts_keyli (email, role, step_reached) values ('x@test.local', 'owner', 'form_started') $$,
  'Le formulaire d''inscription trace une tentative'
);
select throws_ok($$ select * from public.signup_attempts_keyli $$, '42501', null,
  'Un visiteur ne relit pas les tentatives d''inscription');

-- ------------------------------------------------------------
-- Back-office : retours, marketing, onboarding
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('33333333-0000-0000-0000-000000000001');  -- P
select lives_ok(
  $$ insert into public.feedback_keyli (user_id, type, subject, message)
     values ('33333333-0000-0000-0000-000000000001', 'suggestion', 'Carte', 'Ajouter la vue satellite') $$,
  'Un utilisateur envoie un retour'
);
select throws_ok(
  $$ insert into public.marketing_templates_keyli (name, type, content) values ('Pirate', 'whatsapp', 'Spam') $$,
  '42501', null, 'Un utilisateur ne crée pas de modèle marketing'
);
select throws_ok(
  $$ insert into public.onboarding_checklists_keyli (user_id, step) values ('33333333-0000-0000-0000-000000000001', 'Étape inventée') $$,
  '42501', null, 'Un utilisateur ne crée pas ses étapes d''onboarding'
);

select pg_temp.connecter('33333333-0000-0000-0000-0000000000ad');  -- AD
select lives_ok($$ update public.feedback_keyli set status = 'reviewed', admin_response = 'Bonne idée, prévu.' $$,
  'L''admin répond à un retour');
select lives_ok($$ insert into public.marketing_templates_keyli (name, type, content) values ('Lancement', 'whatsapp', 'Keyli arrive à Abidjan') $$,
  'L''admin crée un modèle marketing');
select is((select created_by::text from public.marketing_templates_keyli where name = 'Lancement'),
  '33333333-0000-0000-0000-0000000000ad', 'L''auteur du modèle est renseigné automatiquement');
select lives_ok(
  $$ insert into public.onboarding_checklists_keyli (user_id, step) values ('33333333-0000-0000-0000-000000000001', 'Publier sa première annonce') $$,
  'L''admin pose une étape d''onboarding'
);

select pg_temp.connecter('33333333-0000-0000-0000-000000000001');  -- P
select results_eq($$ select admin_response from public.feedback_keyli $$, $$ values ('Bonne idée, prévu.'::text) $$,
  'L''utilisateur lit la réponse de l''admin');
select lives_ok($$ update public.onboarding_checklists_keyli set completed = true, completed_at = now() $$,
  'L''utilisateur coche son étape');

set local role postgres;
select * from finish();
rollback;
