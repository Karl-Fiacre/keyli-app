-- Keyli — Rôle super_admin, au-dessus de admin
--
-- Décision du porteur de projet du 2026-10-01 (docs/ROLES.md) : un rôle
-- supérieur à admin, qui négocie notamment les formules personnalisées de
-- dépassement Grande Agence (docs/MODULES/pricing.md). Ses droits précis
-- seront posés avec le module admin.
--
-- Jamais attribuable à l'inscription : handle_new_user_keyli() n'accepte
-- que user / owner / agency. Attribution par SQL direct uniquement.
--
-- ALTER TYPE ... ADD VALUE dans sa propre migration : la nouvelle valeur ne
-- peut pas être utilisée dans la transaction qui la crée.

alter type public.user_role_keyli add value if not exists 'super_admin' after 'admin';
