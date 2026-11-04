-- Tests de l'acceptation des CGU (migration 20261109120000_acceptation_cgu_keyli)
-- — exécutés par `npm run db:test` (pgTAP), en local, en CI et sur le
-- projet distant. Transaction annulée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(9);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- A inscrit avec la version en vigueur ; B avec une ancienne version ; C sans
insert into auth.users (id, email, raw_user_meta_data) values
  ('e7e00000-0000-0000-0000-000000000001', 'a-cgu@test.local',
   json_build_object('role_keyli', 'user', 'cgu_version', public.version_cgu_keyli())::jsonb),
  ('e7e00000-0000-0000-0000-000000000002', 'b-cgu@test.local', '{"role_keyli": "user", "cgu_version": "2000-01-01"}'),
  ('e7e00000-0000-0000-0000-000000000003', 'c-cgu@test.local', '{"role_keyli": "owner"}');

select is((select cgu_version from public.profiles_keyli where user_id = 'e7e00000-0000-0000-0000-000000000001'),
  public.version_cgu_keyli(), 'Inscription : version en vigueur enregistrée');
select ok((select cgu_acceptees_at is not null from public.profiles_keyli
           where user_id = 'e7e00000-0000-0000-0000-000000000001'), 'Inscription : date d''acceptation enregistrée');
select is((select cgu_version from public.profiles_keyli where user_id = 'e7e00000-0000-0000-0000-000000000002'),
  null, 'Inscription avec une ancienne version : acceptation non enregistrée');
select is((select cgu_version from public.profiles_keyli where user_id = 'e7e00000-0000-0000-0000-000000000003'),
  null, 'Compte sans acceptation : rien d''enregistré');

-- C accepte à la connexion
set local role authenticated;
select pg_temp.connecter('e7e00000-0000-0000-0000-000000000003');
select throws_ok($$ select public.accepter_cgu_keyli('2000-01-01') $$, '22023', null,
  'Une version périmée est refusée');
select lives_ok(format('select public.accepter_cgu_keyli(%L)', public.version_cgu_keyli()),
  'Acceptation de la version en vigueur');
select throws_ok($$ update public.profiles_keyli set cgu_version = '2099-01-01'
                    where user_id = 'e7e00000-0000-0000-0000-000000000003' $$,
  '42501', null, 'La version acceptée ne se modifie pas directement');
reset role;
set local role postgres;

select is((select cgu_version from public.profiles_keyli where user_id = 'e7e00000-0000-0000-0000-000000000003'),
  public.version_cgu_keyli(), 'Acceptation enregistrée');

set local role anon;
select set_config('test.anon', (select count(*)::text from (select 1) x
  where has_function_privilege('public.accepter_cgu_keyli(text)', 'execute')), true);
reset role;
set local role postgres;
select is(current_setting('test.anon'), '0', 'Un visiteur non connecté ne peut pas accepter');

select * from finish();
rollback;
