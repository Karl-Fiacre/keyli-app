-- Keyli — Extensions de base (Phase 0, avant toute table métier)
--
-- PostGIS activé dès la première migration (décision actée :
-- docs/MODULES/geolocalisation.md, docs/DATABASE.md). Installé dans le schéma
-- « extensions », convention Supabase : le type geography reste accessible
-- partout grâce au search_path par défaut du projet (anon, authenticated,
-- postgres). Sans effet si l'extension a déjà été activée depuis le
-- Dashboard (docs/SETUP.md, étape 3).
--
-- pgcrypto (présent dans le schéma de référence) n'est pas nécessaire :
-- gen_random_uuid() est natif depuis PostgreSQL 13.

create extension if not exists postgis with schema extensions;
