-- Adresse email du profil synchronisée avec Supabase Auth (Sprint 11-12,
-- migration 20261117130000_email_profil_synchronise_keyli.sql).
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('d1100000-0000-0000-0000-000000000001', 'ancienne@test.local', '{"role_keyli": "owner"}');

select is((select email from public.profiles_keyli where user_id = 'd1100000-0000-0000-0000-000000000001'),
  'ancienne@test.local', 'L''inscription copie l''adresse dans le profil');

update auth.users set email = 'nouvelle@test.local' where id = 'd1100000-0000-0000-0000-000000000001';
select is((select email from public.profiles_keyli where user_id = 'd1100000-0000-0000-0000-000000000001'),
  'nouvelle@test.local', 'Un changement d''adresse confirmé dans Auth met le profil à jour');

update auth.users set raw_user_meta_data = '{"role_keyli": "owner", "x": 1}'
 where id = 'd1100000-0000-0000-0000-000000000001';
select is((select email from public.profiles_keyli where user_id = 'd1100000-0000-0000-0000-000000000001'),
  'nouvelle@test.local', 'Une autre modification du compte ne touche pas l''adresse');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "d1100000-0000-0000-0000-000000000001", "role": "authenticated"}', true);
select throws_ok(
  $$ update public.profiles_keyli set email = 'pirate@test.local' where user_id = 'd1100000-0000-0000-0000-000000000001' $$,
  '42501', null, 'L''utilisateur ne modifie pas lui-même l''adresse de son profil');

select * from finish();
rollback;
