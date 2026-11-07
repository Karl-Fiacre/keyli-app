-- Tests des relances, des délais de vérification et du journal des erreurs
-- (migration 20261113120000_stabilisation_pilote_keyli) — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(15);

create function pg_temp.connecter(uid text) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- A : sans pièces, inscrit il y a 4 jours ; B : sans pièces, il y a 10 jours ;
-- C : vérifié sans annonce ; D : document refusé il y a 4 jours ;
-- E : chercheur ; X : admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('d7000000-0000-0000-0000-00000000000a', 'a-rel@test.local', '{"role_keyli": "owner"}'),
  ('d7000000-0000-0000-0000-00000000000b', 'b-rel@test.local', '{"role_keyli": "owner"}'),
  ('d7000000-0000-0000-0000-00000000000c', 'c-rel@test.local', '{"role_keyli": "owner"}'),
  ('d7000000-0000-0000-0000-00000000000d', 'd-rel@test.local', '{"role_keyli": "owner"}'),
  ('d7000000-0000-0000-0000-00000000000e', 'e-rel@test.local', '{"role_keyli": "user"}'),
  ('d7000000-0000-0000-0000-0000000000ff', 'x-rel@test.local', '{"role_keyli": "user"}');
update public.profiles_keyli set role_keyli = 'admin' where user_id = 'd7000000-0000-0000-0000-0000000000ff';
update public.profiles_keyli set created_at = now() - interval '4 days'
 where user_id in ('d7000000-0000-0000-0000-00000000000a', 'd7000000-0000-0000-0000-00000000000c',
                   'd7000000-0000-0000-0000-00000000000d', 'd7000000-0000-0000-0000-00000000000e');
update public.profiles_keyli set created_at = now() - interval '10 days'
 where user_id = 'd7000000-0000-0000-0000-00000000000b';

-- C : pièces approuvées et compte vérifié ; D : un document refusé il y a 4 jours
insert into public.documents_keyli (user_id, doc_type, file_url, status, reviewed_at) values
  ('d7000000-0000-0000-0000-00000000000c', 'extrait_naissance', 'c/1.pdf', 'approved', now() - interval '3 days'),
  ('d7000000-0000-0000-0000-00000000000c', 'cert_residence', 'c/2.pdf', 'approved', now() - interval '3 days');
update public.profiles_keyli set verified = true where user_id = 'd7000000-0000-0000-0000-00000000000c';
insert into public.documents_keyli (user_id, doc_type, file_url, status, review_notes, created_at, reviewed_at) values
  ('d7000000-0000-0000-0000-00000000000d', 'extrait_naissance', 'd/1.pdf', 'rejected', 'Illisible',
   now() - interval '5 days', now() - interval '4 days');
-- Un document en attente depuis 3 jours (en retard) pour le suivi
insert into public.documents_keyli (user_id, doc_type, file_url, status, created_at) values
  ('d7000000-0000-0000-0000-00000000000d', 'cert_residence', 'd/2.pdf', 'pending', now() - interval '3 days');

-- ------------------------------------------------------------
-- Relances
-- ------------------------------------------------------------
select ok(public.relancer_annonceurs_keyli() >= 4, 'Première passe : relances envoyées');
select is((select string_agg(etape || ':' || palier, ',' order by etape) from public.relances_keyli
            where user_id = 'd7000000-0000-0000-0000-00000000000a'), 'documents:3', 'A : relance « pièces » à 3 jours');
select is((select string_agg(etape || ':' || palier, ',' order by etape) from public.relances_keyli
            where user_id = 'd7000000-0000-0000-0000-00000000000b'), 'documents:3',
  'B (10 jours) : seulement la première relance le même jour');
select is((select string_agg(etape, ',' order by etape) from public.relances_keyli
            where user_id = 'd7000000-0000-0000-0000-00000000000c'), 'annonce', 'C vérifié : relance « annonce »');
select is((select string_agg(etape, ',' order by etape) from public.relances_keyli
            where user_id = 'd7000000-0000-0000-0000-00000000000d'), 'document_rejete',
  'D : relance « document à renvoyer », pas « pièces »');
select is((select count(*)::int from public.relances_keyli
            where user_id = 'd7000000-0000-0000-0000-00000000000e'), 0, 'Un chercheur n''est pas relancé');
select is((select count(*)::int from public.notifications_keyli
            where user_id = 'd7000000-0000-0000-0000-00000000000a' and type = 'relance_demarrage'), 1,
  'La relance arrive dans la cloche');
select is((select count(*)::int from public.emails_sortants_keyli
            where user_id = 'd7000000-0000-0000-0000-00000000000a' and type = 'relance_demarrage'), 1,
  'La relance part aussi par email');
select is(public.relancer_annonceurs_keyli(), 0, 'Deuxième passe le même jour : aucune relance en double');

-- B : la première relance date de 5 jours → seconde relance à 7 jours
update public.relances_keyli set created_at = now() - interval '5 days'
 where user_id = 'd7000000-0000-0000-0000-00000000000b';
select is(public.relancer_annonceurs_keyli(), 1, 'B : seconde relance 4 jours après la première');

set local role authenticated;
select pg_temp.connecter('d7000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.relances_keyli), 0, 'Un annonceur ne lit pas le registre des relances');

-- ------------------------------------------------------------
-- Suivi et journal des erreurs
-- ------------------------------------------------------------
select pg_temp.connecter('d7000000-0000-0000-0000-0000000000ff');
select set_config('test.retard', (select documents_en_retard::text from public.suivi_pilote_keyli()), true);
reset role;
set local role anon;
select lives_ok($$ select public.journaliser_erreur_keyli('/annonce/12?source=x', 'Échec pour awa@test.ci tel 0700112233',
  'PGRST', 'Chrome') $$, 'Un visiteur journalise une erreur');
set local role authenticated;
select pg_temp.connecter('d7000000-0000-0000-0000-00000000000a');
select throws_ok($$ select * from public.erreurs_recentes_keyli(7) $$, '42501', null,
  'Un annonceur ne lit pas le journal des erreurs');
select pg_temp.connecter('d7000000-0000-0000-0000-0000000000ff');
select set_config('test.erreur', (select page || '|' || message from public.erreurs_recentes_keyli(7) limit 1), true);
reset role;
set local role postgres;

select ok(current_setting('test.retard')::int >= 1, 'Le suivi compte les dossiers en attente depuis plus de 48 h');
select is(current_setting('test.erreur'), '/annonce/12|Échec pour [email] tel [nombre]',
  'Page sans paramètres, email et numéro masqués');

select * from finish();
rollback;
