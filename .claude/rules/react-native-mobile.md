---
paths:
  - "apps/mobile/**/*.tsx"
  - "apps/mobile/**/*.ts"
---

# Conventions React Native / Mobile (Keyli — socle Expo SDK 58 depuis le Sprint 13)

- Structure cible : voir `docs/STRUCTURE_FRONTEND.md` section Mobile, et la
  table de correspondance Web ↔ Mobile du répertoire de fichiers sources.
- La logique métier est dans `src/partage/` (Sprint 10,
  `docs/LOGIQUE_PARTAGEE.md`) : le mobile l'importe telle quelle et fournit
  seulement ses deux points d'entrée (`@/integrations/supabase/client` et
  `@/plateforme`) — jamais une réécriture indépendante de la même règle
  métier. Si une règle diverge entre web et mobile, le
  signaler avant de coder plutôt que de laisser diverger silencieusement.
- `apps/mobile/src/services/native/` (caméra, biométrie, push, géolocalisation
  continue) est la seule zone de code réellement spécifique au mobile.
- Pas de Framer Motion ni de dépendance d'animation web (`dashboard-animations.css`
  ne s'applique pas ici) — les animations mobiles utilisent l'API Animated
  ou Reanimated de React Native, à spécifier au moment de la Phase 3.
- Aucune clé secrète en dur — mêmes règles que le web (`docs/STACK.md`).
- Couleurs, rayons, espaces : uniquement `src/theme/tokens.ts` ; composer
  les écrans avec `src/composants/base.tsx` plutôt que redéfinir des styles.
- Code propre au mobile importé par `@mobile/…` ; code partagé par
  `@/partage/…`. Toute fonction pure utile aux deux va dans `src/partage/`
  avec un test Vitest, jamais recopiée dans `apps/mobile`.
- Module natif : uniquement ceux inclus dans Expo Go tant que le porteur
  essaie avec Expo Go (sinon il faut une version de développement compilée).
- Contrôles avant commit : `npm run typecheck` et
  `npx expo export --platform android` dans `apps/mobile` (Node 22.13+).
