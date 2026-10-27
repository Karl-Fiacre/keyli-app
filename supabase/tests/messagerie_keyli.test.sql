-- Tests de la messagerie (conversations, lecture, temps réel) — exécutés
-- par `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(11);

-- O propriétaire abonné avec une annonce ; C et D chercheurs
insert into auth.users (id, email, raw_user_meta_data) values
  ('efef0000-0000-0000-0000-00000000000a', 'o@test.local', '{"role_keyli": "owner", "first_name": "Yao", "last_name": "Kouadio"}'),
  ('efef0000-0000-0000-0000-00000000000c', 'c@test.local', '{"first_name": "Aminata", "last_name": "Diallo"}'),
  ('efef0000-0000-0000-0000-00000000000d', 'd@test.local', '{"first_name": "Didier", "last_name": "Bamba"}');
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select 'efef0000-0000-0000-0000-00000000000a', p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from public.plans_keyli p where p.code = 'proprietaire';
insert into public.properties_keyli (id, owner_id, title, type, status, price, city, geolocation)
values ('efef1111-0000-0000-0000-000000000001', 'efef0000-0000-0000-0000-00000000000a', 'Studio Marcory',
        'studio', 'a_louer', 100000, 'Abidjan', 'SRID=4326;POINT(-3.99 5.30)');

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.ecrire(de text, a text, corps text, decalage interval) returns void
language sql as $$
  insert into public.messages_keyli (from_user, to_user, property_id, body, created_at)
  values (de::uuid, a::uuid, 'efef1111-0000-0000-0000-000000000001', corps, now() - decalage);
$$;

-- Fils : C écrit deux fois, O répond, puis D écrit (le plus récent)
select pg_temp.ecrire('efef0000-0000-0000-0000-00000000000c', 'efef0000-0000-0000-0000-00000000000a', 'Bonjour, disponible ?', '3 hours');
select pg_temp.ecrire('efef0000-0000-0000-0000-00000000000a', 'efef0000-0000-0000-0000-00000000000c', 'Oui, visite possible samedi.', '2 hours');
select pg_temp.ecrire('efef0000-0000-0000-0000-00000000000c', 'efef0000-0000-0000-0000-00000000000a', 'Parfait, samedi 10 h.', '90 minutes');
select pg_temp.ecrire('efef0000-0000-0000-0000-00000000000c', 'efef0000-0000-0000-0000-00000000000a', 'Je viendrai avec mon frère.', '80 minutes');
select pg_temp.ecrire('efef0000-0000-0000-0000-00000000000d', 'efef0000-0000-0000-0000-00000000000a', 'Toujours libre ?', '10 minutes');

set local role authenticated;

-- ------------------------------------------------------------
-- Conversations du propriétaire
-- ------------------------------------------------------------
select pg_temp.connecter('efef0000-0000-0000-0000-00000000000a');
select results_eq(
  $$ select nom_interlocuteur, dernier_message, envoye_par_moi, non_lus from public.mes_conversations_keyli() $$,
  $$ values ('Didier B.'::text, 'Toujours libre ?'::text, false, 1::bigint),
            ('Aminata D.'::text, 'Je viendrai avec mon frère.'::text, false, 3::bigint) $$,
  'Une conversation par bien et interlocuteur, la plus récente d''abord, avec ses non-lus');
select is((select titre_annonce from public.mes_conversations_keyli() limit 1), 'Studio Marcory',
  'La conversation porte le titre de l''annonce');

-- Ouverture du fil avec C : ses messages passent « lus »
update public.messages_keyli set read = true
 where to_user = 'efef0000-0000-0000-0000-00000000000a' and from_user = 'efef0000-0000-0000-0000-00000000000c'
   and property_id = 'efef1111-0000-0000-0000-000000000001';
select is((select non_lus from public.mes_conversations_keyli() where interlocuteur = 'efef0000-0000-0000-0000-00000000000c'),
  0::bigint, 'Après ouverture du fil, plus de non-lus');
select is((select non_lus from public.mes_conversations_keyli() where interlocuteur = 'efef0000-0000-0000-0000-00000000000d'),
  1::bigint, 'Les autres conversations gardent leurs non-lus');

-- Réponse à D (il a écrit le premier) : autorisée
select lives_ok($$ insert into public.messages_keyli (from_user, to_user, property_id, body)
  values ('efef0000-0000-0000-0000-00000000000a', 'efef0000-0000-0000-0000-00000000000d',
          'efef1111-0000-0000-0000-000000000001', 'Oui, toujours libre.') $$,
  'Le propriétaire répond à quelqu''un qui lui a écrit');

-- ------------------------------------------------------------
-- Côté chercheurs
-- ------------------------------------------------------------
select pg_temp.connecter('efef0000-0000-0000-0000-00000000000c');
select results_eq(
  $$ select nom_interlocuteur, envoye_par_moi, non_lus from public.mes_conversations_keyli() $$,
  $$ values ('Yao K.'::text, true, 1::bigint) $$,
  'Le chercheur voit sa seule conversation ; la réponse du propriétaire est non lue');
select is((select count(*)::int from public.messages_keyli), 4, 'Le chercheur ne lit que ses propres messages');

select pg_temp.connecter('efef0000-0000-0000-0000-00000000000d');
update public.messages_keyli set read = true where from_user = 'efef0000-0000-0000-0000-00000000000d';
select is((select read from public.messages_keyli where from_user = 'efef0000-0000-0000-0000-00000000000d'),
  false, 'Un expéditeur ne peut pas marquer « lu » son propre message : seul le destinataire le peut');
select is((select count(*)::int from public.mes_conversations_keyli()), 1,
  'D ne voit que sa conversation, jamais celle de C');
select throws_ok($$ insert into public.messages_keyli (from_user, to_user, property_id, body)
  values ('efef0000-0000-0000-0000-00000000000d', 'efef0000-0000-0000-0000-00000000000c',
          'efef1111-0000-0000-0000-000000000001', 'Salut') $$,
  '42501', null, 'Pas de démarchage entre chercheurs');

-- ------------------------------------------------------------
-- Temps réel
-- ------------------------------------------------------------
set local role postgres;
select ok(exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'messages_keyli'),
  'Les messages sont diffusés par Supabase Realtime');

select * from finish();
rollback;
