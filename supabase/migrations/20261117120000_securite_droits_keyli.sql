-- ============================================================
-- Sprint 11-12 — stabilisation pré-mobile : droits de la base (2026-11-08)
-- Décision du porteur : revue de sécurité (docs/MODULES/stabilisation-pre-mobile.md).
--
-- Constat de l'audit : Supabase accorde par défaut TOUS les droits aux
-- rôles anon et authenticated sur chaque nouvelle table et fonction du
-- schéma public. Les migrations Keyli retirent ces droits (« revoke ») puis
-- accordent le strict nécessaire — sauf sur trois tables où le retrait a été
-- oublié. La RLS bloquait déjà lecture et écriture non prévues, mais pas :
--   * TRUNCATE (vider la table), que la RLS ne couvre pas ;
--   * les restrictions par colonne de types_chambres_keyli, rendues
--     inopérantes par le droit UPDATE accordé sur toute la table.
-- Aucun appel du site n'utilisait ces droits en trop.
--
-- 1. Les trois tables reçoivent exactement les droits prévus.
-- 2. Les futurs objets ne reçoivent plus rien par défaut : chaque migration
--    accorde explicitement (pratique déjà suivie partout).
-- Contrôle permanent : supabase/tests/audit_securite_keyli.test.sql.
-- ============================================================

-- ---------- 1. Droits exacts ----------
revoke all on public.emails_sortants_keyli from anon, authenticated;
grant select on public.emails_sortants_keyli to authenticated;        -- admins (policy)

revoke all on public.reservations_keyli from anon, authenticated;
grant select on public.reservations_keyli to authenticated;           -- voyageur, hôte, admin (policy)

revoke all on public.types_chambres_keyli from anon, authenticated;
grant select on public.types_chambres_keyli to anon, authenticated;
grant insert (property_id, nom, description, quantite, prix_nuit, voyageurs_max, actif)
  on public.types_chambres_keyli to authenticated;
grant update (nom, description, quantite, prix_nuit, voyageurs_max, actif)
  on public.types_chambres_keyli to authenticated;

-- ---------- 2. Rien par défaut pour les objets futurs ----------
-- Objets créés par les migrations (rôle postgres). Le rôle service_role
-- (Edge Functions) garde ses droits par défaut.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
