# Keyli — Checklist de démarrage (nouveau projet Supabase, vide)

Le projet démarre **sans aucune table**. Les tables sont créées une à une,
au fur et à mesure de l'implémentation de chaque module — pas en une seule
migration d'un coup. `reference/schema_cible_reference.sql` donne le schéma
final visé, à consulter module par module, jamais à exécuter tel quel.

## Étapes uniques (à faire une fois, avant toute table)
1. [ ] Créer le compte Supabase (nouveau compte)
2. [ ] Créer le projet — région Europe (Frankfurt/Paris) recommandée
3. [ ] `Database → Extensions` → activer `postgis` (même si la première
       table créée n'en a pas besoin — l'activer tôt évite d'y repenser plus
       tard sur une base déjà peuplée)
4. [ ] Copier `.env.example` → `.env`, renseigner `VITE_SUPABASE_URL` et
       `VITE_SUPABASE_ANON_KEY` (Project Settings → API)
5. [ ] Créer les secrets d'Edge Functions (Paystack, Cloudinary) dans
       Supabase Dashboard → Edge Functions → Secrets — jamais dans `.env`

## Répété à chaque module (voir MODULES/README.md pour l'ordre)
1. [ ] Lire le `MODULES/<nom>.md` du module en cours
2. [ ] Copier uniquement les `CREATE TABLE`/enums correspondants depuis
       `reference/schema_cible_reference.sql`
3. [ ] Écrire la migration dans `supabase/migrations/` (une migration par
       étape logique, pas tout d'un bloc)
4. [ ] Activer RLS **et** écrire les policies de cette table **dans la même
       migration** — jamais RLS activée sans policy, même temporairement
5. [ ] `supabase gen types typescript` → régénérer
       `src/integrations/supabase/types.ts`
6. [ ] Tester la table avec un compte de chaque rôle concerné avant de
       passer au module suivant

## Identifiants — rappel de sécurité
Seuls **l'URL du projet** et la **clé anon publique** doivent être transmis
pour connecter le web/mobile. Ne jamais transmettre ni coller dans le chat :
la clé `service_role`, le mot de passe de connexion Postgres directe, ou
tout secret d'Edge Function (Paystack, Cloudinary).

## Ce qui n'est PAS dans cette checklist (volontairement)
- Hébergement/Cloudflare — étape de déploiement, pas de développement
  (MODULES/hebergement-securite.md)
- Normalisation des quartiers — pas un prérequis au démarrage
  (MODULES/quartiers-tendance.md)
- Configuration mobile React Native — Phase 3 du calendrier, pas maintenant
