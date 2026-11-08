-- Audit de sécurité permanent de la base (Sprint 11-12,
-- docs/MODULES/stabilisation-pre-mobile.md). Échoue dès qu'une migration
-- affaiblit une règle : la CI bloque alors la fusion.
-- Ajouter une exception à une liste ci-dessous est une décision consciente,
-- à justifier dans la migration concernée.
begin;
create extension if not exists pgtap with schema extensions;

set local role postgres;
set local search_path = "$user", public, extensions;

select plan(13);

-- ---------- RLS ----------
select is_empty(
  $$ select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'Toutes les tables publiques ont la RLS activée');

select is_empty(
  $$ select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
        and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) $$,
  'Chaque table publique a au moins une policy');

select is_empty(
  $$ select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'v', 'm') and c.relname not like '%\_keyli' $$,
  'Toutes les tables et vues publiques sont suffixées _keyli');

-- ---------- Droits sur les tables ----------
select is_empty(
  $$ select grantee || ' ' || privilege_type || ' ' || table_name from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated')
        and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER') $$,
  'Aucun compte ne peut vider une table ni y poser de déclencheur ou de référence');

select is_empty(
  $$ select privilege_type || ' ' || table_name from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE', 'DELETE') $$,
  'Un visiteur n''a aucun droit d''écriture sur une table entière');

select is_empty(
  $$ select g.privilege_type || ' ' || g.table_name from information_schema.role_table_grants g
      where g.table_schema = 'public' and g.grantee = 'authenticated'
        and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE')
        and not exists (select 1 from pg_policies p
                         where p.schemaname = 'public' and p.tablename = g.table_name
                           and p.cmd in (g.privilege_type, 'ALL')) $$,
  'Tout droit d''écriture d''un compte connecté est encadré par une policy');

-- ---------- Fonctions ----------
select is_empty(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
        and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') $$,
  'Toute fonction « security definer » fixe son search_path');

select set_eq(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute') $$,
  $$ values
       ('abonnement_en_cours_keyli'),   -- règle de lecture publique des annonces
       ('compte_actif_keyli'),          -- règle de lecture publique des annonces
       ('positions_annonces_keyli'),    -- carte publique (positions arrondies)
       ('devis_sejour_keyli'),          -- prix d'un séjour sur la fiche
       ('occupation_sejour_keyli'),     -- disponibilités sur la fiche
       ('candidater_pilote_keyli'),     -- candidature au pilote (débit limité)
       ('envoyer_demande_support_keyli'), -- formulaire d'aide (débit limité)
       ('journaliser_erreur_keyli'),    -- journal des erreurs (débit limité)
       ('desinscrire_emails_keyli')     -- lien de désinscription (jeton)
  $$,
  'Seules les fonctions « security definer » prévues sont ouvertes aux visiteurs');

select is_empty(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef and p.proname in (
        'confirmer_paiement_keyli', 'echec_paiement_keyli', 'abandonner_paiement_keyli',
        'prendre_paiements_a_verifier_keyli', 'surveiller_paiements_keyli', 'anomalies_paiements_keyli',
        'traiter_echeances_abonnements_keyli', 'cloturer_cycles_keyli', 'relancer_annonceurs_keyli',
        'declencher_envoi_emails_keyli', 'declencher_rapprochement_paiements_keyli', 'purger_erreurs_client_keyli',
        'synchroniser_email_profil_keyli')
        and (has_function_privilege('anon', p.oid, 'execute')
             or has_function_privilege('authenticated', p.oid, 'execute')) $$,
  'Les fonctions réservées au serveur et aux tâches planifiées sont fermées aux comptes');

-- ---------- Vues ----------
select set_eq(
  $$ select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('v', 'm')
        and not coalesce((select bool_or(o in ('security_invoker=true', 'security_invoker=on'))
                            from unnest(c.reloptions) o), false) $$,
  $$ values ('profils_publics_keyli') $$,
  'Seule la vue des profils publics (colonnes non sensibles) contourne la RLS');

select is_empty(
  $$ select column_name::text from information_schema.columns
      where table_schema = 'public' and table_name = 'profils_publics_keyli'
        and column_name in ('email', 'phone', 'first_name', 'last_name', 'jeton_desinscription') $$,
  'La vue des profils publics n''expose ni email, ni téléphone, ni nom complet, ni jeton');

-- ---------- Stockage ----------
select is_empty($$ select id from storage.buckets where public $$,
  'Aucun bucket de stockage n''est public');

-- ---------- Objets futurs ----------
create table public.essai_audit_keyli (id int primary key);
select is_empty(
  $$ select d.defaclobjtype::text from pg_default_acl d
      where d.defaclrole = 'postgres'::regrole and d.defaclnamespace = 'public'::regnamespace
        and exists (select 1 from unnest(d.defaclacl) a
                     where a::text like 'anon=%' or a::text like 'authenticated=%') $$,
  'Les droits par défaut des futurs objets (tables, séquences, fonctions) n''incluent plus les comptes');

select * from finish();
rollback;
