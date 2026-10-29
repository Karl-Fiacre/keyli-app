-- Tests de la cloche de notifications — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant (`--linked`).
-- Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(6);

insert into auth.users (id, email) values
  ('bcbc0000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('bcbc0000-0000-0000-0000-00000000000b', 'b@test.local');
insert into public.notifications_keyli (user_id, type, titre) values
  ('bcbc0000-0000-0000-0000-00000000000a', 'compte_reactive', 'Pour A, 1'),
  ('bcbc0000-0000-0000-0000-00000000000a', 'compte_reactive', 'Pour A, 2'),
  ('bcbc0000-0000-0000-0000-00000000000b', 'compte_reactive', 'Pour B');

select ok(exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and tablename = 'notifications_keyli'),
  'Les notifications sont diffusées par Supabase Realtime');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "bcbc0000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select is((select count(*)::int from public.notifications_keyli where not lue), 2,
  'Pastille : A compte ses seules notifications non lues');
-- « Tout marquer comme lu »
update public.notifications_keyli set lue = true where not lue;
select is((select count(*)::int from public.notifications_keyli where not lue), 0, 'A marque toutes ses notifications lues');
select throws_ok($$ update public.notifications_keyli set titre = 'Modifié' $$, '42501', null,
  'Seule la colonne « lue » est modifiable');
select throws_ok($$ insert into public.notifications_keyli (user_id, type, titre)
  values ('bcbc0000-0000-0000-0000-00000000000a', 'compte_reactive', 'Fausse') $$, '42501', null,
  'Une notification ne se crée pas depuis le client');

set local role postgres;
select is((select lue from public.notifications_keyli where titre = 'Pour B'), false,
  'Les notifications de B ne sont pas touchées');

select * from finish();
rollback;
