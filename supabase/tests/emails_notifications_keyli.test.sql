-- Tests des emails de notification (migration
-- 20261107120000_emails_notifications_keyli) — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant. Transaction annulée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(27);

-- P propriétaire abonné ; C chercheur ; D chercheur qui coupe les emails ; A admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('e6e00000-0000-0000-0000-000000000001', 'p-mail@test.local', '{"role_keyli": "owner", "first_name": "Awa"}'),
  ('e6e00000-0000-0000-0000-000000000002', 'c-mail@test.local', '{"role_keyli": "user", "first_name": "Koffi"}'),
  ('e6e00000-0000-0000-0000-000000000003', 'd-mail@test.local', '{"role_keyli": "user"}'),
  ('e6e00000-0000-0000-0000-000000000004', 'a-mail@test.local', '{"role_keyli": "user"}');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'e6e00000-0000-0000-0000-000000000004';

insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'e6e00000-0000-0000-0000-000000000001', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Annonce du propriétaire (support des conversations)
set local role authenticated;
select pg_temp.connecter('e6e00000-0000-0000-0000-000000000001');
select set_config('test.bien', public.publier_annonce_keyli(
  'Studio Marcory', 'studio', 'a_louer', 120000, 'Abidjan', 5.30, -3.99,
  array['https://res.cloudinary.com/' || public.cloudinary_cloud_keyli() || '/image/upload/keyli/annonces/'
        || 'e6e00000-0000-0000-0000-000000000001/' || gen_random_uuid()::text || '.jpg'])::text, true);
reset role;
set local role postgres;

-- ------------------------------------------------------------
-- Structure
-- ------------------------------------------------------------
select has_column('public', 'profiles_keyli', 'emails_notifications', 'Préférence emails sur le profil');
select is((select emails_notifications from public.profiles_keyli where user_id = 'e6e00000-0000-0000-0000-000000000002'),
  true, 'Notifications par email actives par défaut');
select ok((select relrowsecurity from pg_class where oid = 'public.emails_sortants_keyli'::regclass),
  'RLS active sur la file d''emails');
select is((select count(*)::int from cron.job where jobname = 'keyli-envoi-emails'), 1, 'Tâche planifiée créée');

-- ------------------------------------------------------------
-- Mise en file des notifications
-- ------------------------------------------------------------
insert into public.notifications_keyli (user_id, type, titre, contenu, property_id)
values ('e6e00000-0000-0000-0000-000000000001', 'reservation_demandee', 'Nouvelle demande', 'Koffi demande 2 nuits',
        current_setting('test.bien')::uuid);
select is((select count(*)::int from public.emails_sortants_keyli
           where user_id = 'e6e00000-0000-0000-0000-000000000001' and type = 'reservation_demandee'),
  1, 'Une demande de réservation part par email');

insert into public.notifications_keyli (user_id, type, titre, contenu)
values ('e6e00000-0000-0000-0000-000000000001', 'recommandation_forfait', 'Forfait', 'Passez au forfait supérieur');
select is((select count(*)::int from public.emails_sortants_keyli where type = 'recommandation_forfait'),
  0, 'Une recommandation de forfait reste dans l''application');

update public.profiles_keyli set emails_notifications = false where user_id = 'e6e00000-0000-0000-0000-000000000003';
insert into public.notifications_keyli (user_id, type, titre, contenu) values
  ('e6e00000-0000-0000-0000-000000000003', 'visite_planifiee', 'Visite', 'Visite demain'),
  ('e6e00000-0000-0000-0000-000000000003', 'compte_suspendu', 'Compte suspendu', 'Motif');
select is((select count(*)::int from public.emails_sortants_keyli
           where user_id = 'e6e00000-0000-0000-0000-000000000003' and type = 'visite_planifiee'),
  0, 'Emails coupés : pas d''email de visite');
select is((select count(*)::int from public.emails_sortants_keyli
           where user_id = 'e6e00000-0000-0000-0000-000000000003' and type = 'compte_suspendu'),
  1, 'Emails coupés : l''email de service (suspension) part quand même');

-- ------------------------------------------------------------
-- Messages : regroupement
-- ------------------------------------------------------------
insert into public.messages_keyli (from_user, to_user, property_id, body)
values ('e6e00000-0000-0000-0000-000000000002', 'e6e00000-0000-0000-0000-000000000001',
        current_setting('test.bien')::uuid, 'Bonjour, le studio est-il libre ?');
select is((select count(*)::int from public.emails_sortants_keyli
           where categorie = 'message' and user_id = 'e6e00000-0000-0000-0000-000000000001'),
  1, 'Un nouveau message met un email en file');
select ok((select envoyer_apres >= now() + interval '4 minutes' from public.emails_sortants_keyli
           where categorie = 'message' and user_id = 'e6e00000-0000-0000-0000-000000000001'),
  'Email de message différé de 5 minutes (le temps de le lire)');

insert into public.messages_keyli (from_user, to_user, property_id, body)
values ('e6e00000-0000-0000-0000-000000000002', 'e6e00000-0000-0000-0000-000000000001',
        current_setting('test.bien')::uuid, 'Je peux visiter samedi.');
select is((select count(*)::int from public.emails_sortants_keyli
           where categorie = 'message' and user_id = 'e6e00000-0000-0000-0000-000000000001'),
  1, 'Messages suivants regroupés dans le même email');

-- Message au chercheur, qui le lit avant l'envoi
insert into public.messages_keyli (from_user, to_user, property_id, body)
values ('e6e00000-0000-0000-0000-000000000001', 'e6e00000-0000-0000-0000-000000000002',
        current_setting('test.bien')::uuid, 'Oui, samedi 10 h.');
update public.messages_keyli set read = true where to_user = 'e6e00000-0000-0000-0000-000000000002';

-- ------------------------------------------------------------
-- Droits
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('e6e00000-0000-0000-0000-000000000001');
select throws_ok($$ select * from public.prendre_emails_keyli(10) $$, '42501', null,
  'Un utilisateur ne peut pas vider la file');
select is((select count(*)::int from public.emails_sortants_keyli), 0, 'Un utilisateur ne lit pas la file d''emails');
select lives_ok($$ update public.profiles_keyli set emails_notifications = false
                   where user_id = 'e6e00000-0000-0000-0000-000000000001' $$,
  'L''utilisateur règle sa préférence');
select throws_ok($$ update public.profiles_keyli set jeton_desinscription = gen_random_uuid()
                    where user_id = 'e6e00000-0000-0000-0000-000000000001' $$,
  '42501', null, 'Le jeton de désinscription n''est pas modifiable');
update public.profiles_keyli set emails_notifications = true where user_id = 'e6e00000-0000-0000-0000-000000000001';

select pg_temp.connecter('e6e00000-0000-0000-0000-000000000004');
select ok((select count(*) from public.emails_sortants_keyli) >= 3, 'Un admin suit la file d''emails');
reset role;
set local role postgres;

-- ------------------------------------------------------------
-- Envoi (service_role)
-- ------------------------------------------------------------
update public.emails_sortants_keyli set envoyer_apres = now() - interval '1 minute';
set local role service_role;
create temp table lot as select * from public.prendre_emails_keyli(50);
reset role;
set local role postgres;

select is((select count(*)::int from lot where type = 'reservation_demandee'), 1, 'La demande de réservation est prise');
select is((select prenom from lot where type = 'reservation_demandee'), 'Awa', 'Prénom du destinataire fourni');
select is((select non_lus from lot where categorie = 'message'), 2, 'Email de message : 2 messages non lus');
select is((select expediteur from lot where categorie = 'message'), 'Koffi', 'Email de message : prénom de l''expéditeur');
select is((select statut from public.emails_sortants_keyli
           where categorie = 'message' and user_id = 'e6e00000-0000-0000-0000-000000000002'),
  'ignore', 'Messages déjà lus : email écarté');
select is((select count(*)::int from public.emails_sortants_keyli where statut = 'en_cours'),
  (select count(*)::int from lot), 'Le lot pris est marqué en cours');

set local role service_role;
select public.terminer_email_keyli((select id from lot where type = 'reservation_demandee'), true);
select public.terminer_email_keyli((select id from lot where categorie = 'message'), false, 'Resend indisponible');
reset role;
set local role postgres;
select is((select statut from public.emails_sortants_keyli e join lot using (id) where lot.type = 'reservation_demandee'),
  'envoye', 'Envoi réussi enregistré');
select is((select statut || ' ' || (envoyer_apres > now())::text from public.emails_sortants_keyli e join lot using (id)
           where lot.categorie = 'message'),
  'en_attente true', 'Échec : nouvel essai programmé plus tard');

update public.emails_sortants_keyli e set statut = 'en_cours', tentatives = 5
  from lot where e.id = lot.id and lot.categorie = 'message';
set local role service_role;
select public.terminer_email_keyli((select id from lot where categorie = 'message'), false, 'Toujours indisponible');
reset role;
set local role postgres;
select is((select e.statut from public.emails_sortants_keyli e join lot using (id) where lot.categorie = 'message'),
  'echec', 'Abandon après 5 tentatives');

-- ------------------------------------------------------------
-- Désinscription sans connexion
-- ------------------------------------------------------------
select set_config('test.jeton', (select jeton_desinscription::text from public.profiles_keyli
                                 where user_id = 'e6e00000-0000-0000-0000-000000000002'), true);
-- Appel en visiteur anonyme ; vérification ensuite (pgTAP n'est pas
-- forcément visible du rôle anon sur le projet distant)
set local role anon;
select set_config('test.desinscrit', public.desinscrire_emails_keyli(current_setting('test.jeton')::uuid)::text, true);
reset role;
set local role postgres;
select is(current_setting('test.desinscrit'), 'true', 'Lien de désinscription accepté (visiteur non connecté)');
select is((select emails_notifications from public.profiles_keyli where user_id = 'e6e00000-0000-0000-0000-000000000002'),
  false, 'Désinscription enregistrée');

select * from finish();
rollback;
