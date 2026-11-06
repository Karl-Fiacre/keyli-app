-- Tests du parcours de démarrage et des retours (migration
-- 20261111120000_demarrage_retours_keyli) — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant. Transaction annulée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(16);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- P propriétaire, A agence, C chercheur, X admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('d5000000-0000-0000-0000-000000000001', 'p-dem@test.local', '{"role_keyli": "owner", "first_name": "Yao", "last_name": "Kouadio"}'),
  ('d5000000-0000-0000-0000-000000000002', 'a-dem@test.local', '{"role_keyli": "agency", "first_name": "Awa", "last_name": "Koné", "nom_agence": "Ivoire Habitat"}'),
  ('d5000000-0000-0000-0000-000000000003', 'c-dem@test.local', '{"role_keyli": "user"}'),
  ('d5000000-0000-0000-0000-000000000004', 'x-dem@test.local', '{"role_keyli": "user"}');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'd5000000-0000-0000-0000-000000000004';

-- ------------------------------------------------------------
-- Parcours de démarrage
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('d5000000-0000-0000-0000-000000000001');
select set_config('test.p_depart', (select string_agg(etape || '=' || faite, ',' order by ordre)
  from public.etapes_demarrage_keyli()), true);
reset role;
set local role postgres;
select is(current_setting('test.p_depart'),
  'profil=false,documents=false,verification=false,forfait=false,annonce=false',
  'Propriétaire : 5 étapes, aucune faite (téléphone manquant)');

-- Le propriétaire avance : téléphone, documents, forfait, annonce
update public.profiles_keyli set phone = '+2250700000000' where user_id = 'd5000000-0000-0000-0000-000000000001';
insert into public.documents_keyli (user_id, doc_type, file_url, status) values
  ('d5000000-0000-0000-0000-000000000001', 'extrait_naissance', 'x/1.pdf', 'pending'),
  ('d5000000-0000-0000-0000-000000000001', 'cert_residence', 'x/2.pdf', 'pending');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'd5000000-0000-0000-0000-000000000001', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';
insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation)
values ('d5000000-0000-0000-0000-000000000001', 'Studio démarrage', 'studio', 'a_louer', 100000, 'Abidjan',
        'SRID=4326;POINT(-4.00 5.35)');

set local role authenticated;
select pg_temp.connecter('d5000000-0000-0000-0000-000000000001');
select set_config('test.p_suite', (select string_agg(etape || '=' || faite, ',' order by ordre)
  from public.etapes_demarrage_keyli()), true);
-- Agence : étape « équipe » en plus
select pg_temp.connecter('d5000000-0000-0000-0000-000000000002');
select set_config('test.a', (select string_agg(etape, ',' order by ordre) from public.etapes_demarrage_keyli()), true);
-- Chercheur : aucune étape
select pg_temp.connecter('d5000000-0000-0000-0000-000000000003');
select set_config('test.c', (select count(*)::text from public.etapes_demarrage_keyli()), true);
reset role;
set local role postgres;

select is(current_setting('test.p_suite'),
  'profil=true,documents=true,verification=false,forfait=true,annonce=true',
  'Étapes cochées d''après les données réelles (vérification encore en attente)');
select is(current_setting('test.a'), 'profil,documents,verification,forfait,annonce,equipe',
  'Agence : étape « équipe » en plus');
select is(current_setting('test.c'), '0', 'Chercheur : pas de parcours annonceur');

set local role anon;
select set_config('test.anon_etapes', (select count(*)::text from (select 1) x
  where has_function_privilege('public.etapes_demarrage_keyli()', 'execute')), true);
reset role;
set local role postgres;
select is(current_setting('test.anon_etapes'), '0', 'Un visiteur ne peut pas appeler le parcours');

-- ------------------------------------------------------------
-- Retours
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('d5000000-0000-0000-0000-000000000003');
select lives_ok($$ insert into public.feedback_keyli (user_id, type, subject, message)
  values ('d5000000-0000-0000-0000-000000000003', 'suggestion', 'Filtre par budget',
          'Pouvoir filtrer par budget maximum serait utile.') $$,
  'Un utilisateur envoie un retour');
select throws_ok($$ insert into public.feedback_keyli (user_id, type, subject, message)
  values ('d5000000-0000-0000-0000-000000000003', 'bug', 'Ok', 'Trop court') $$,
  '23514', null, 'Sujet et message trop courts refusés');
select throws_ok($$ insert into public.feedback_keyli (user_id, type, subject, message)
  values ('d5000000-0000-0000-0000-000000000001', 'bug', 'Usurpation', 'Retour au nom d''un autre compte.') $$,
  '42501', null, 'Impossible d''envoyer un retour au nom d''un autre');
update public.feedback_keyli set admin_response = 'Merci';
select results_eq($$ select count(*)::int from public.feedback_keyli where admin_response is not null $$,
  $$ values (0) $$, 'L''utilisateur ne répond pas lui-même à son retour');
select results_eq($$ select status from public.feedback_keyli $$, $$ values ('pending'::text) $$,
  'Le retour arrive « en attente »');

-- 4 retours de plus (5 au total) passent, le 6e est refusé
select lives_ok($$ insert into public.feedback_keyli (user_id, type, subject, message)
  select 'd5000000-0000-0000-0000-000000000003', 'suggestion', 'Idée ' || g, 'Une idée de plus pour Keyli.'
    from generate_series(2, 5) g $$, '5 retours par jour acceptés');
select throws_ok($$ insert into public.feedback_keyli (user_id, type, subject, message)
  values ('d5000000-0000-0000-0000-000000000003', 'suggestion', 'Encore une', 'Une sixième idée aujourd''hui.') $$,
  '23514', null, 'Le 6e retour de la journée est refusé');

-- L'admin répond : notification à l'auteur
select pg_temp.connecter('d5000000-0000-0000-0000-000000000004');
select lives_ok($$ update public.feedback_keyli set admin_response = 'Bonne idée, c''est prévu.', status = 'resolved'
                    where subject = 'Filtre par budget' $$, 'L''admin répond');
reset role;
set local role postgres;

select is((select count(*)::int from public.notifications_keyli
            where user_id = 'd5000000-0000-0000-0000-000000000003' and type = 'retour_repondu'),
  1, 'L''auteur est notifié de la réponse');
select is((select count(*)::int from public.emails_sortants_keyli
            where user_id = 'd5000000-0000-0000-0000-000000000003' and type = 'retour_repondu'),
  1, 'La réponse part aussi par email');
update public.feedback_keyli set status = 'reviewed' where subject = 'Filtre par budget';
select is((select count(*)::int from public.notifications_keyli
            where user_id = 'd5000000-0000-0000-0000-000000000003' and type = 'retour_repondu'),
  1, 'Changer seulement le statut ne renotifie pas');

select * from finish();
rollback;
