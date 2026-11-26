-- Tests de la conformité des boutiques (migration
-- 20261122120000_conformite_stores_keyli) : blocage, signalement d'un
-- utilisateur, suppression de compte. pgTAP, transaction annulée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(24);

-- P propriétaire abonné ; C chercheur ; X inconnu
insert into auth.users (id, email, raw_user_meta_data) values
  ('c0f00000-0000-0000-0000-000000000001', 'p-conf@test.local', '{"role_keyli": "owner", "first_name": "Paul", "last_name": "Proprio"}'),
  ('c0f00000-0000-0000-0000-000000000002', 'c-conf@test.local', '{"role_keyli": "user", "first_name": "Chloé", "last_name": "Cherche"}'),
  ('c0f00000-0000-0000-0000-000000000003', 'x-conf@test.local', '{"role_keyli": "user"}');

insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'c0f00000-0000-0000-0000-000000000001', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
$$;

create function pg_temp.photo() returns text
language sql volatile as $$
  select 'https://res.cloudinary.com/' || public.cloudinary_cloud_keyli()
      || '/image/upload/keyli/annonces/' || (select auth.uid())::text || '/' || gen_random_uuid()::text || '.jpg';
$$;
grant execute on function pg_temp.photo() to authenticated;

create function pg_temp.j(n integer) returns date
language sql stable as $$ select (now() at time zone 'Africa/Abidjan')::date + n $$;
grant execute on function pg_temp.j(integer) to anon, authenticated;

set local role authenticated;

-- Annonce de P, en séjour court
select pg_temp.connecter('c0f00000-0000-0000-0000-000000000001');
select set_config('test.bien', public.publier_annonce_keyli(
  'Studio Marcory', 'studio', 'a_louer', 20000, 'Abidjan', 5.30, -3.98, array[pg_temp.photo()],
  p_sejour_court => true, p_nuits_min => 1, p_voyageurs_max => 2)::text, true);

-- C écrit à P au sujet du bien, P répond
select pg_temp.connecter('c0f00000-0000-0000-0000-000000000002');
insert into public.messages_keyli (from_user, to_user, property_id, body)
values ('c0f00000-0000-0000-0000-000000000002', 'c0f00000-0000-0000-0000-000000000001',
        current_setting('test.bien')::uuid, 'Bonjour, le studio est-il libre ?');
select pg_temp.connecter('c0f00000-0000-0000-0000-000000000001');
insert into public.messages_keyli (from_user, to_user, property_id, body)
values ('c0f00000-0000-0000-0000-000000000001', 'c0f00000-0000-0000-0000-000000000002',
        current_setting('test.bien')::uuid, 'Oui, à partir de lundi.');

-- ------------------------------------------------------------
-- Signaler un utilisateur
-- ------------------------------------------------------------
select pg_temp.connecter('c0f00000-0000-0000-0000-000000000002');
select lives_ok(
  $$ insert into public.reports_keyli (reporter_id, reported_user_id, motif)
     values ('c0f00000-0000-0000-0000-000000000002', 'c0f00000-0000-0000-0000-000000000001', 'comportement') $$,
  'On signale quelqu''un qui nous a écrit');
select throws_ok(
  $$ insert into public.reports_keyli (reporter_id, reported_user_id, motif)
     values ('c0f00000-0000-0000-0000-000000000002', 'c0f00000-0000-0000-0000-000000000001', 'fraude') $$,
  '23505', null, 'Un seul signalement en attente par personne signalée');
select throws_ok(
  $$ insert into public.reports_keyli (reporter_id, reported_user_id, motif)
     values ('c0f00000-0000-0000-0000-000000000002', 'c0f00000-0000-0000-0000-000000000003', 'comportement') $$,
  '42501', null, 'On ne signale pas un inconnu qui ne nous a jamais écrit');
select lives_ok(
  $$ insert into public.reports_keyli (reporter_id, property_id, motif)
     values ('c0f00000-0000-0000-0000-000000000002', current_setting('test.bien')::uuid, 'indisponible') $$,
  'Signaler l''annonce reste possible en plus de l''utilisateur');

-- ------------------------------------------------------------
-- Blocage
-- ------------------------------------------------------------
select lives_ok(
  $$ insert into public.blocages_keyli (bloqueur_id, bloque_id)
     values ('c0f00000-0000-0000-0000-000000000002', 'c0f00000-0000-0000-0000-000000000001') $$,
  'C bloque P');
select throws_ok(
  $$ insert into public.blocages_keyli (bloqueur_id, bloque_id)
     values ('c0f00000-0000-0000-0000-000000000001', 'c0f00000-0000-0000-0000-000000000003') $$,
  '42501', null, 'On ne pose pas un blocage au nom d''un autre');
select throws_ok(
  $$ insert into public.blocages_keyli (bloqueur_id, bloque_id)
     values ('c0f00000-0000-0000-0000-000000000002', 'c0f00000-0000-0000-0000-000000000002') $$,
  '23514', null, 'On ne se bloque pas soi-même');
select is((select count(*)::int from public.mes_blocages_keyli()), 1, 'C voit son blocage');
select is((select nom from public.mes_blocages_keyli()), 'Paul Proprio', 'avec le nom de la personne bloquée');
select throws_ok(
  $$ insert into public.messages_keyli (from_user, to_user, property_id, body)
     values ('c0f00000-0000-0000-0000-000000000002', 'c0f00000-0000-0000-0000-000000000001',
             current_setting('test.bien')::uuid, 'Encore moi') $$,
  '42501', null, 'C ne peut plus écrire à P');

select pg_temp.connecter('c0f00000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.blocages_keyli), 0, 'P ne voit pas qui l''a bloqué');
select throws_ok(
  $$ insert into public.messages_keyli (from_user, to_user, property_id, body)
     values ('c0f00000-0000-0000-0000-000000000001', 'c0f00000-0000-0000-0000-000000000002',
             current_setting('test.bien')::uuid, 'Vous êtes là ?') $$,
  '42501', null, 'P ne peut plus écrire à C non plus');

select pg_temp.connecter('c0f00000-0000-0000-0000-000000000002');
delete from public.blocages_keyli where bloque_id = 'c0f00000-0000-0000-0000-000000000001';
select lives_ok(
  $$ insert into public.messages_keyli (from_user, to_user, property_id, body)
     values ('c0f00000-0000-0000-0000-000000000002', 'c0f00000-0000-0000-0000-000000000001',
             current_setting('test.bien')::uuid, 'Finalement je réserve') $$,
  'Après déblocage, l''échange reprend');

-- Demande de réservation de C chez P (pour la suppression)
select set_config('test.resa', public.demander_reservation_keyli(
  current_setting('test.bien')::uuid, null, pg_temp.j(10), pg_temp.j(12), 1)::text, true);

-- ------------------------------------------------------------
-- Suppression de compte
-- ------------------------------------------------------------
select throws_ok(
  $$ select public.supprimer_compte_keyli('c0f00000-0000-0000-0000-000000000002') $$,
  '42501', null, 'Un utilisateur ne peut pas appeler la suppression directement (fonction Edge seulement)');

reset role;
set local role service_role;
select lives_ok(
  $$ select public.supprimer_compte_keyli('c0f00000-0000-0000-0000-000000000002') $$,
  'La fonction Edge (service_role) supprime le compte de C');
select lives_ok(
  $$ select public.supprimer_compte_keyli('c0f00000-0000-0000-0000-000000000002') $$,
  'Une seconde demande ne fait rien (idempotent)');

reset role;
set local role postgres;
select is(
  (select row(first_name, last_name, phone, suspendu, compte_supprime_le is not null)::text
     from public.profiles_keyli where user_id = 'c0f00000-0000-0000-0000-000000000002'),
  row(null::text, null::text, null::text, true, true)::text,
  'Profil de C vidé, suspendu et daté');
select is((select email from public.profiles_keyli where user_id = 'c0f00000-0000-0000-0000-000000000002'),
  'supprime-c0f00000-0000-0000-0000-000000000002@keyli.invalid', 'Email du profil anonymisé');
select is((select count(*)::int from public.messages_keyli
            where 'c0f00000-0000-0000-0000-000000000002' in (from_user, to_user)),
  0, 'Messages de C effacés');
select is((select count(*)::int from public.reports_keyli
            where reporter_id = 'c0f00000-0000-0000-0000-000000000002'),
  0, 'Signalements faits par C effacés');
select is((select statut::text from public.reservations_keyli where id = current_setting('test.resa')::uuid),
  'annulee', 'Demande de séjour de C annulée');
select is((select count(*)::int from public.notifications_keyli
            where user_id = 'c0f00000-0000-0000-0000-000000000001' and type = 'reservation_annulee'),
  1, 'L''hôte est prévenu de l''annulation');
select is((select count(*)::int from public.audit_logs_keyli
            where action = 'suppression_compte' and entity_id = 'c0f00000-0000-0000-0000-000000000002'),
  1, 'Suppression tracée dans le journal d''audit');

-- Le propriétaire supprimé : annonces retirées
set local role service_role;
select public.supprimer_compte_keyli('c0f00000-0000-0000-0000-000000000001');
reset role;
set local role postgres;
select isnt((select archived_at from public.properties_keyli where id = current_setting('test.bien')::uuid),
  null, 'Annonces du propriétaire supprimé retirées');

select * from finish();
rollback;
