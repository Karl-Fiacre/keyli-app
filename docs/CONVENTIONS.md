# Conventions de code — Keyli

## Langue
Commentaires de code en français (cohérence avec le code existant).
Noms de variables/fonctions/composants en camelCase ou PascalCase anglais.

## Architecture Frontend
```
Page (src/pages) → Hook métier (src/hooks) → Client Supabase
                                             (src/integrations/supabase)
```
Un composant de page ne doit pas appeler `supabase.from(...)` directement —
passer par un hook dédié, même simple. Voir STRUCTURE_FRONTEND.md.

## Composants dashboard
Voir KEYLI_DASHBOARD_DESIGN_SPEC.md pour la liste des composants factorisés
(`KpiCard`, `VerificationStepper`, `DonutChart`, etc.) — ne jamais dupliquer
un composant déjà spécifié entre les dashboards Agence/Propriétaire/Chercheur.

## Nommage fichiers
```
Pages       : PascalCase.tsx           (ex. OwnerDashboard.tsx)
Composants  : PascalCase.tsx           (ex. KpiCard.tsx)
Hooks       : useNomDuHook.ts          (ex. useSubscription.ts)
Services    : camelCase.ts             (ex. paystack.ts)
```

## Supabase / RLS
- Toute nouvelle table sensible (données utilisateur) doit avoir RLS activée
  dans la même migration que sa création — jamais en différé.
- Toute nouvelle table doit être suffixée `_keyli` (voir DATABASE.md —
  dette technique sur les tables non suffixées, à ne pas reproduire).
- Ne jamais désactiver RLS pour "tester plus vite" — utiliser un compte de
  test avec le bon rôle à la place.

## Validation
`zod` déjà en dépendance — utiliser des schémas Zod pour toute validation de
formulaire (`react-hook-form` + `zodResolver`), cohérent avec l'existant.

## Erreurs
Pas de convention de code HTTP formalisée pour les Edge Functions
existantes — à établir avant d'en écrire de nouvelles plutôt que d'improviser
au cas par cas (proposer : 400 validation, 401 non authentifié, 403 rôle
non autorisé, 404 non trouvé, 409 conflit métier, 422 règle métier violée).

## Tests
Base de données : tests RLS en pgTAP dans `supabase/tests/`, un fichier par
table, rejoués en CI (voir SETUP.md) — obligatoires pour toute nouvelle
policy.
Web : Playwright (à installer au premier parcours critique — il était
configuré dans l'ancien pilote) (`playwright.config.ts`) — écrire un test
end-to-end pour tout nouveau parcours critique (paiement, vérification,
changement de forfait), pas uniquement pour les nouvelles pages UI.
