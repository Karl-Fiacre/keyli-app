-- Tests de la candidature et du suivi du pilote (migration
-- 20261112120000_lancement_pilote_keyli) — exécutés par `npm run db:test`
-- (pgTAP), en local, en CI et sur le projet distant. Transaction annulée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(15);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- X admin, P propriétaire déjà inscrit sous l'email d'une candidature
insert into auth.users (id, email, raw_user_meta_data) values
  ('d6000000-0000-0000-0000-000000000001', 'x-pil@test.local', '{"role_keyli": "user"}'),
  ('d6000000-0000-0000-0000-000000000002', 'yao.pil@test.local',
   '{"role_keyli": "owner", "first_name": "Yao", "last_name": "Kouadio"}');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'd6000000-0000-0000-0000-000000000001';

-- ------------------------------------------------------------
-- Candidature (visiteur)
-- ------------------------------------------------------------
set local role anon;
select lives_ok($$ select public.candidater_pilote_keyli('Yao.Pil@test.local', 'Yao', 'Kouadio', '+225 07 00 00 00 01',
  'proprietaire', 'Cocody', null, 3, 'Trois studios à louer.') $$, 'Un visiteur candidate au pilote');
select lives_ok($$ select public.candidater_pilote_keyli('yao.pil@test.local', 'Yao', 'Kouadio', '+2250700000001',
  'proprietaire', 'Cocody', null, 4, null) $$, 'Même email : aucune erreur (rien n''est révélé)');
select throws_ok($$ select public.candidater_pilote_keyli('pas-un-email', 'A', 'B', '+2250700000002', 'chercheur') $$,
  '22023', null, 'Email invalide refusé');
select throws_ok($$ select public.candidater_pilote_keyli('a@test.local', 'A', 'B', '0700000002', 'chercheur') $$,
  '22023', null, 'Téléphone sans +225 refusé');
select throws_ok($$ select public.candidater_pilote_keyli('b@test.local', 'A', 'B', '+2250700000003', 'agence') $$,
  '22023', null, 'Agence sans nom d''agence refusée');
select throws_ok($$ select public.candidater_pilote_keyli('c@test.local', 'A', 'B', '+2250700000004', 'chercheur',
  'Paris') $$, '22023', null, 'Commune hors pilote refusée');
select throws_ok($$ insert into public.inscription_pilot_keyli (email) values ('direct@test.local') $$,
  '42501', null, 'Plus d''insertion directe dans la table');
select throws_ok($$ select * from public.suivi_pilote_keyli() $$, '42501', null, 'Un visiteur ne voit pas le suivi');
reset role;
set local role postgres;

select is((select count(*)::int from public.inscription_pilot_keyli where email = 'yao.pil@test.local'), 1,
  'Une seule candidature par email, email mis en minuscules');
select is((select nb_biens from public.inscription_pilot_keyli where email = 'yao.pil@test.local'), 4,
  'Une candidature en attente est mise à jour');

-- Une candidature déjà traitée n'est plus modifiée par un nouvel envoi
update public.inscription_pilot_keyli set status = 'contacte' where email = 'yao.pil@test.local';
set local role anon;
select public.candidater_pilote_keyli('yao.pil@test.local', 'Autre', 'Nom', '+2250700000009', 'chercheur');
reset role;
set local role postgres;
select is((select first_name from public.inscription_pilot_keyli where email = 'yao.pil@test.local'), 'Yao',
  'Une candidature déjà contactée reste inchangée');

-- ------------------------------------------------------------
-- Suivi (admin)
-- ------------------------------------------------------------
set local role authenticated;
select pg_temp.connecter('d6000000-0000-0000-0000-000000000002');
select throws_ok($$ select * from public.candidatures_pilote_keyli('contacte') $$, '42501', null,
  'Un annonceur ne lit pas les candidatures');
select pg_temp.connecter('d6000000-0000-0000-0000-000000000001');
select set_config('test.compte', (select compte_cree::text from public.candidatures_pilote_keyli('contacte')
  where email = 'yao.pil@test.local'), true);
select set_config('test.suivi', (select candidatures_contactees || ',' || candidatures_avec_compte || ',' || annonceurs
  || ',' || annonceurs_profil from public.suivi_pilote_keyli()), true);
select lives_ok($$ update public.inscription_pilot_keyli set note_admin = 'Rappeler lundi', priority_level = 'haute'
  where email = 'yao.pil@test.local' $$, 'L''admin annote et priorise une candidature');
reset role;
set local role postgres;

select is(current_setting('test.compte'), 'true', 'La file signale qu''un compte existe pour cet email');
-- 1 contactée, 1 avec compte ; annonceurs : au moins le propriétaire de test, profil incomplet (sans téléphone)
select ok(split_part(current_setting('test.suivi'), ',', 1) = '1'
  and split_part(current_setting('test.suivi'), ',', 2) = '1'
  and split_part(current_setting('test.suivi'), ',', 3)::int >= 1, 'Le suivi compte candidatures et annonceurs');

select * from finish();
rollback;
