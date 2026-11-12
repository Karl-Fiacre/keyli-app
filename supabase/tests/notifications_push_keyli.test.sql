-- Tests des notifications push (migration
-- 20261118120000_notifications_push_keyli, Sprint 17) — exécutés par
-- `npm run db:test` (pgTAP). Transaction annulée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(23);

-- P propriétaire abonné (iPhone + Android) ; C chercheur (Android) ;
-- S sans téléphone ; A admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('f7f00000-0000-0000-0000-000000000001', 'p-push@test.local', '{"role_keyli": "owner", "first_name": "Awa"}'),
  ('f7f00000-0000-0000-0000-000000000002', 'c-push@test.local', '{"role_keyli": "user", "first_name": "Koffi"}'),
  ('f7f00000-0000-0000-0000-000000000003', 's-push@test.local', '{"role_keyli": "user"}'),
  ('f7f00000-0000-0000-0000-000000000004', 'a-push@test.local', '{"role_keyli": "user"}');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'f7f00000-0000-0000-0000-000000000004';

insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'f7f00000-0000-0000-0000-000000000001', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ------------------------------------------------------------
-- Structure
-- ------------------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'public.appareils_push_keyli'::regclass),
  'RLS active sur les appareils');
select ok((select relrowsecurity from pg_class where oid = 'public.pushs_sortants_keyli'::regclass),
  'RLS active sur la file des push');
select is((select count(*)::int from cron.job where jobname = 'keyli-envoi-pushs'), 1, 'Tâche planifiée créée');

-- ------------------------------------------------------------
-- Enregistrement des appareils
-- ------------------------------------------------------------
set local role anon;
select throws_ok($$ select public.enregistrer_appareil_push_keyli('jeton-anonyme-0000000000', 'ios') $$,
  '42501', null, 'Un visiteur non connecté n''enregistre pas d''appareil');
reset role;

set local role authenticated;
select pg_temp.connecter('f7f00000-0000-0000-0000-000000000001');
select lives_ok($$ select public.enregistrer_appareil_push_keyli('jeton-iphone-awa-000000000', 'ios', 'sandbox') $$,
  'Le propriétaire enregistre son iPhone');
select lives_ok($$ select public.enregistrer_appareil_push_keyli('jeton-android-awa-00000000', 'android') $$,
  'Le propriétaire enregistre aussi son Android');
select throws_ok($$ select public.enregistrer_appareil_push_keyli('jeton-windows-0000000000', 'windows') $$,
  '22023', null, 'Plateforme inconnue refusée');

select pg_temp.connecter('f7f00000-0000-0000-0000-000000000002');
select lives_ok($$ select public.enregistrer_appareil_push_keyli('jeton-android-koffi-000000', 'android') $$,
  'Le chercheur enregistre son téléphone');
select is((select count(*)::int from public.appareils_push_keyli), 1, 'Chacun ne voit que ses appareils');

-- Annonce du propriétaire (support des conversations)
select pg_temp.connecter('f7f00000-0000-0000-0000-000000000001');
select set_config('test.bien', public.publier_annonce_keyli(
  'Studio Cocody', 'studio', 'a_louer', 150000, 'Abidjan', 5.35, -3.98,
  array['https://res.cloudinary.com/' || public.cloudinary_cloud_keyli() || '/image/upload/keyli/annonces/'
        || 'f7f00000-0000-0000-0000-000000000001/' || gen_random_uuid()::text || '.jpg'])::text, true);
reset role;
set local role postgres;

-- Même téléphone repris par un autre compte : seul le dernier est notifié
set local role authenticated;
select pg_temp.connecter('f7f00000-0000-0000-0000-000000000003');
select public.enregistrer_appareil_push_keyli('jeton-android-koffi-000000', 'android');
select pg_temp.connecter('f7f00000-0000-0000-0000-000000000002');
select public.enregistrer_appareil_push_keyli('jeton-android-koffi-000000', 'android');
reset role;
set local role postgres;
select is((select user_id::text from public.appareils_push_keyli where jeton = 'jeton-android-koffi-000000'),
  'f7f00000-0000-0000-0000-000000000002', 'Un jeton repris change de compte');

-- ------------------------------------------------------------
-- Mise en file
-- ------------------------------------------------------------
insert into public.notifications_keyli (user_id, type, titre, contenu) values
  ('f7f00000-0000-0000-0000-000000000001', 'document_approuve', 'Document approuvé', 'Votre registre est validé'),
  ('f7f00000-0000-0000-0000-000000000001', 'recommandation_forfait', 'Forfait', 'Passez au forfait supérieur'),
  ('f7f00000-0000-0000-0000-000000000003', 'abonnement_expire', 'Abonnement expiré', 'Renouvelez');
select is((select count(*)::int from public.pushs_sortants_keyli where type = 'document_approuve'),
  1, 'Statut de vérification : push en file');
select is((select count(*)::int from public.pushs_sortants_keyli where type = 'recommandation_forfait'),
  0, 'Une recommandation de forfait reste dans l''application');
select is((select count(*)::int from public.pushs_sortants_keyli where user_id = 'f7f00000-0000-0000-0000-000000000003'),
  0, 'Sans téléphone enregistré : aucun push');

insert into public.messages_keyli (from_user, to_user, property_id, body)
values ('f7f00000-0000-0000-0000-000000000002', 'f7f00000-0000-0000-0000-000000000001',
        current_setting('test.bien')::uuid, 'Bonjour, le studio est-il libre ?'),
       ('f7f00000-0000-0000-0000-000000000002', 'f7f00000-0000-0000-0000-000000000001',
        current_setting('test.bien')::uuid, 'Je peux visiter samedi.');
select is((select count(*)::int from public.pushs_sortants_keyli
           where categorie = 'message' and user_id = 'f7f00000-0000-0000-0000-000000000001'),
  1, 'Messages d''une même conversation regroupés dans un push');
select ok((select envoyer_apres <= now() from public.pushs_sortants_keyli
           where categorie = 'message' and user_id = 'f7f00000-0000-0000-0000-000000000001'),
  'Push de message immédiat');

-- Message au chercheur, lu avant l'envoi
insert into public.messages_keyli (from_user, to_user, property_id, body)
values ('f7f00000-0000-0000-0000-000000000001', 'f7f00000-0000-0000-0000-000000000002',
        current_setting('test.bien')::uuid, 'Oui, samedi 10 h.');
update public.messages_keyli set read = true where to_user = 'f7f00000-0000-0000-0000-000000000002';

-- ------------------------------------------------------------
-- Droits
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('f7f00000-0000-0000-0000-000000000001');
select throws_ok($$ select * from public.prendre_pushs_keyli(10) $$, '42501', null,
  'Un utilisateur ne peut pas vider la file');
select is((select count(*)::int from public.pushs_sortants_keyli), 0, 'Un utilisateur ne lit pas la file des push');
select pg_temp.connecter('f7f00000-0000-0000-0000-000000000004');
select ok((select count(*) from public.pushs_sortants_keyli) >= 3, 'Un admin suit la file des push');
reset role;
set local role postgres;

-- ------------------------------------------------------------
-- Envoi (service_role)
-- ------------------------------------------------------------
set local role service_role;
create temp table lot as select * from public.prendre_pushs_keyli(50);
reset role;
set local role postgres;

select is((select jsonb_array_length(appareils) from lot where type = 'document_approuve'),
  2, 'Tous les téléphones du compte reçoivent la notification');
select is((select expediteur || ' ' || non_lus from lot where categorie = 'message'),
  'Koffi 2', 'Push de message : expéditeur et nombre de non lus');
select is((select statut from public.pushs_sortants_keyli
           where categorie = 'message' and user_id = 'f7f00000-0000-0000-0000-000000000002'),
  'ignore', 'Messages déjà lus : push écarté');

set local role service_role;
select public.terminer_push_keyli((select id from lot where type = 'document_approuve'), true);
select public.terminer_push_keyli((select id from lot where categorie = 'message'), false, 'APNs indisponible');
select public.retirer_jetons_push_keyli(array['jeton-iphone-awa-000000000']);
reset role;
set local role postgres;
select is((select p.statut || ' ' || (p.envoyer_apres > now())::text from public.pushs_sortants_keyli p
           join lot using (id) where lot.categorie = 'message'),
  'en_attente true', 'Échec : nouvel essai programmé plus tard');
select is((select count(*)::int from public.appareils_push_keyli where user_id = 'f7f00000-0000-0000-0000-000000000001'),
  1, 'Jeton refusé par Apple retiré');

select * from finish();
rollback;
