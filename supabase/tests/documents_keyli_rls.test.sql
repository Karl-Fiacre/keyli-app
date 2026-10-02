-- Tests RLS de documents_keyli et du bucket documents_keyli — exécutés par
-- `npm run db:test` (pgTAP), en local, en CI et sur le projet distant
-- (`--linked`). Transaction annulée à la fin : aucune donnée ne subsiste.
--
-- La limite de taille et de format est appliquée par l'API Storage à
-- l'envoi, pas par Postgres : ici on vérifie sa configuration ; le refus
-- réel d'un fichier trop gros se teste par un envoi via l'API.
begin;
create extension if not exists pgtap with schema extensions;

-- Rôle postgres + schéma extensions : voir profiles_keyli_rls.test.sql
set local role postgres;
set local search_path = "$user", public, extensions;

select plan(24);

-- ------------------------------------------------------------
-- Comptes de test : P et Q propriétaires, A agence, U chercheur
-- ------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'proprio@test.local', '{"role_keyli": "owner"}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'proprio2@test.local', '{"role_keyli": "owner"}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'agence@test.local', '{"role_keyli": "agency"}'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'chercheur@test.local', '{}');

-- Abonnements actifs : la publication exige un forfait en cours
-- (migration 20261002160000_limite_forfait_publication_keyli.sql)
insert into public.subscriptions_keyli (user_id, plan_id, amount, start_date, end_date)
select u.id, p.id, p.prix_mensuel, now() - interval '1 day', now() + interval '1 month'
  from (values ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'proprietaire'),
               ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'proprietaire')) as u(id, code)
  join public.plans_keyli p on p.code = u.code;

insert into public.properties_keyli (owner_id, title, type, status, price, city, geolocation) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Villa P1', 'villa', 'a_vendre', 1, 'Abidjan', 'SRID=4326;POINT(-3.96 5.36)'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Villa P2', 'villa', 'a_vendre', 1, 'Abidjan', 'SRID=4326;POINT(-3.97 5.37)'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Maison Q', 'maison', 'a_vendre', 1, 'Abidjan', 'SRID=4326;POINT(-4.00 5.30)');

select set_config('test.villa_p1', (select id::text from public.properties_keyli where title = 'Villa P1'), true);
select set_config('test.villa_p2', (select id::text from public.properties_keyli where title = 'Villa P2'), true);
select set_config('test.maison_q', (select id::text from public.properties_keyli where title = 'Maison Q'), true);

-- ------------------------------------------------------------
-- Structure et bucket
-- ------------------------------------------------------------
select has_table('public', 'documents_keyli', 'La table documents_keyli existe');
select is(
  (select relrowsecurity from pg_class where oid = 'public.documents_keyli'::regclass),
  true,
  'RLS est activée sur documents_keyli'
);
select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'documents_keyli' $$,
  $$ values (false, 5242880::bigint, array['application/pdf', 'image/jpeg', 'image/png']) $$,
  'Bucket privé, 5 Mo maximum, PDF / JPEG / PNG uniquement'
);

-- ------------------------------------------------------------
-- Propriétaire P connecté
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents_keyli', 'cccccccc-cccc-cccc-cccc-cccccccccccc/acd-villa-p1.pdf') $$,
  'Un propriétaire envoie un fichier dans son dossier'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents_keyli', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/faux.pdf') $$,
  '42501', null,
  'Un propriétaire ne peut pas envoyer dans le dossier d''un autre'
);
select lives_ok(
  $$ insert into public.documents_keyli (user_id, property_id, doc_type, file_url) values
       ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.villa_p1')::uuid, 'acd',
        'cccccccc-cccc-cccc-cccc-cccccccccccc/acd-villa-p1.pdf'),
       ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.villa_p2')::uuid, 'acd',
        'cccccccc-cccc-cccc-cccc-cccccccccccc/acd-villa-p2.pdf'),
       ('cccccccc-cccc-cccc-cccc-cccccccccccc', null, 'extrait_naissance',
        'cccccccc-cccc-cccc-cccc-cccccccccccc/extrait.pdf') $$,
  'Un propriétaire dépose un ACD par bien et une pièce personnelle'
);
select is(
  (select count(*)::int from public.documents_keyli where status = 'pending'),
  3,
  'Les documents déposés sont en attente de revue'
);
select throws_ok(
  $$ insert into public.documents_keyli (user_id, property_id, doc_type, file_url)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.villa_p1')::uuid, 'acd',
             'cccccccc-cccc-cccc-cccc-cccccccccccc/acd-bis.pdf') $$,
  '23505', null,
  'Pas de second ACD en attente pour le même bien'
);
select throws_ok(
  $$ insert into public.documents_keyli (user_id, doc_type, file_url)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'extrait_naissance',
             'cccccccc-cccc-cccc-cccc-cccccccccccc/extrait-bis.pdf') $$,
  '23505', null,
  'Pas de seconde pièce personnelle du même type en attente'
);
select throws_ok(
  $$ insert into public.documents_keyli (user_id, doc_type, file_url)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'registre',
             'cccccccc-cccc-cccc-cccc-cccccccccccc/registre.pdf') $$,
  '42501', null,
  'Un propriétaire ne dépose pas de registre de commerce'
);
select throws_ok(
  $$ insert into public.documents_keyli (user_id, property_id, doc_type, file_url)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', current_setting('test.maison_q')::uuid, 'acd',
             'cccccccc-cccc-cccc-cccc-cccccccccccc/acd-maison-q.pdf') $$,
  '42501', null,
  'Un propriétaire ne dépose pas de document pour le bien d''un autre'
);
select throws_ok(
  $$ insert into public.documents_keyli (user_id, doc_type, file_url)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cert_residence',
             'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/residence.pdf') $$,
  '42501', null,
  'Un document doit pointer vers son propre dossier de stockage'
);
select throws_ok(
  $$ insert into public.documents_keyli (user_id, doc_type, file_url, status)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cert_residence',
             'cccccccc-cccc-cccc-cccc-cccccccccccc/residence.pdf', 'approved') $$,
  '42501', null,
  'Un propriétaire ne peut pas déposer un document déjà approuvé'
);
select throws_ok(
  $$ update public.documents_keyli set status = 'approved' where doc_type = 'extrait_naissance' $$,
  '42501', null,
  'Un propriétaire ne peut pas approuver son propre document'
);
select throws_ok(
  $$ delete from public.documents_keyli where doc_type = 'extrait_naissance' $$,
  '42501', null,
  'Un propriétaire ne peut pas supprimer un document'
);
-- Pas de policy UPDATE : la modification ne touche aucune ligne
update storage.objects set name = 'cccccccc-cccc-cccc-cccc-cccccccccccc/remplace.pdf'
 where name = 'cccccccc-cccc-cccc-cccc-cccccccccccc/acd-villa-p1.pdf';
select results_eq(
  $$ select name from storage.objects where bucket_id = 'documents_keyli' $$,
  $$ values ('cccccccc-cccc-cccc-cccc-cccccccccccc/acd-villa-p1.pdf'::text) $$,
  'Un fichier déposé ne peut pas être remplacé ni renommé'
);

-- ------------------------------------------------------------
-- Agence A connectée
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.documents_keyli (user_id, doc_type, file_url)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'registre',
             'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/registre.pdf') $$,
  'Une agence dépose son registre de commerce'
);
select throws_ok(
  $$ insert into public.documents_keyli (user_id, doc_type, file_url)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'extrait_naissance',
             'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/extrait.pdf') $$,
  '42501', null,
  'Une agence ne dépose que le registre de commerce'
);
select results_eq(
  $$ select count(*)::int from public.documents_keyli $$,
  $$ values (1) $$,
  'Une agence ne voit que ses propres documents'
);
select results_eq(
  $$ select count(*)::int from storage.objects where bucket_id = 'documents_keyli' $$,
  $$ values (0) $$,
  'Une agence ne voit pas les fichiers d''un propriétaire'
);

-- ------------------------------------------------------------
-- Chercheur U connecté
-- ------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents_keyli', 'dddddddd-dddd-dddd-dddd-dddddddddddd/piece.pdf') $$,
  '42501', null,
  'Un chercheur ne peut pas envoyer de document'
);

-- ------------------------------------------------------------
-- Visiteur anonyme
-- ------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select throws_ok(
  $$ select * from public.documents_keyli $$,
  '42501', null,
  'Un visiteur anonyme ne peut pas lire les documents'
);

-- ------------------------------------------------------------
-- Règle du rejet commenté (écriture serveur, en postgres)
-- ------------------------------------------------------------
set local role postgres;
select throws_ok(
  $$ update public.documents_keyli set status = 'rejected', review_notes = '  '
      where doc_type = 'extrait_naissance' $$,
  '23514', null,
  'Un rejet sans commentaire est refusé'
);
select lives_ok(
  $$ update public.documents_keyli set status = 'rejected', review_notes = 'Document illisible'
      where doc_type = 'extrait_naissance' $$,
  'Un rejet commenté est accepté'
);

select * from finish();
rollback;
