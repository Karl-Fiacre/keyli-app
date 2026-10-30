-- Tests de l'activité quotidienne (admin) — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant (`--linked`).
-- Transaction annulée à la fin.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(5);

insert into auth.users (id, email) values
  ('acac0000-0000-0000-0000-00000000000e', 'm@test.local'),
  ('acac0000-0000-0000-0000-00000000000c', 'c@test.local');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'acac0000-0000-0000-0000-00000000000e';

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.connecter('acac0000-0000-0000-0000-00000000000c');
select throws_ok($$ select * from public.admin_activite_quotidienne_keyli() $$, '42501', null,
  'Réservé aux administrateurs');

select pg_temp.connecter('acac0000-0000-0000-0000-00000000000e');
select is((select count(*)::int from public.admin_activite_quotidienne_keyli()), 30,
  'Série continue de 30 jours par défaut');
select is((select count(*)::int from public.admin_activite_quotidienne_keyli(500)), 90,
  'Période plafonnée à 90 jours');
select ok((select jour from public.admin_activite_quotidienne_keyli() order by jour desc limit 1)
          = (now() at time zone 'Africa/Abidjan')::date,
  'La série se termine aujourd''hui (heure d''Abidjan)');
select ok((select inscriptions >= 1 from public.admin_activite_quotidienne_keyli() order by jour desc limit 1),
  'L''inscription du chercheur de test compte aujourd''hui (l''admin non)');

select * from finish();
rollback;
