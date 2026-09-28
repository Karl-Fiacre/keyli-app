---
paths:
  - "src/**/*.tsx"
  - "src/**/*.ts"
---

# Conventions React / Web (Keyli)

- Mode strict TypeScript — jamais de `any` sans commentaire justifiant pourquoi.
- Un composant de page (`src/pages/`) ne doit jamais appeler `supabase.from(...)`
  directement — toujours via un hook dédié (`src/hooks/`), même simple. Voir
  `docs/STRUCTURE_FRONTEND.md`.
- Composants dashboard (`KpiCard`, `VerificationStepper`, etc.) : toujours
  composer depuis `src/components/dashboard/` — ne jamais recréer une
  variante locale dans une page. Voir `docs/KEYLI_DASHBOARD_DESIGN_SPEC.md`.
- Toute couleur, rayon, ombre utilisé dans un écran vient des tokens définis
  dans `src/index.css`/`tailwind.config.ts` — jamais une valeur hexadécimale
  inventée à la volée dans un composant. Voir `docs/LOGO.md` pour la palette.
- Animations : classes de `src/styles/dashboard-animations.css` uniquement —
  ne pas réécrire de keyframes équivalents ailleurs. Voir `docs/ANIMATIONS.md`.
- Validation de formulaire : `zod` + `react-hook-form` (déjà en dépendance),
  cohérent avec l'existant — ne pas introduire une autre lib de validation.
- Nommage : composants et pages en `PascalCase.tsx`, hooks en
  `useNomDuHook.ts`, services en `camelCase.ts`.
- Commentaires de code en français.
