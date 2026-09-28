---
paths:
  - "supabase/**/*.sql"
  - "supabase/functions/**/*.ts"
---

# Conventions Supabase / Backend (Keyli)

**Règle d'or (rappel) : Supabase est la seule source de vérité.** Le
frontend (web ou mobile) n'exécute jamais seul un calcul métier sensible
(dépassement de forfait, vérification, montant de transaction) — RLS et les
Edge Functions sont la protection réelle, pas l'UI.

- Le projet Supabase démarre **vide** — tables créées une à une, module par
  module, jamais en une seule migration. Voir `docs/SETUP.md`.
- Toute nouvelle table est suffixée `_keyli` dès sa création — jamais une
  version non suffixée "en attendant" (voir `docs/DATABASE.md`, section
  historique — c'est exactement l'erreur commise sur l'ancien projet).
- RLS activée **et** policies écrites dans la même migration — jamais l'une
  sans l'autre (RLS sans policy bloque tout accès, y compris légitime).
- Toute action sensible (changement de rôle, override de statut, calcul de
  dépassement de forfait) passe par une Edge Function qui vérifie elle-même
  le rôle de l'appelant et écrit une entrée `audit_logs_keyli` — jamais une
  écriture directe depuis le client, même autorisée par RLS.
- Requêtes multi-filtres : vérifier l'index composite nécessaire avant de
  déployer — voir `docs/DATABASE_LOGIC.md` pour le catalogue des requêtes
  déjà identifiées et ajouter toute nouvelle requête le jour même de sa
  création.
- `supabase gen types typescript` à régénérer après toute migration —
  `src/integrations/supabase/types.ts` ne doit jamais être modifié à la main.
- Aucun secret (`service_role`, Paystack, Cloudinary) dans le code déployé —
  uniquement dans les secrets d'Edge Functions.
