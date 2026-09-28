---
paths:
  - "apps/mobile/**/*.tsx"
  - "apps/mobile/**/*.ts"
---

# Conventions React Native / Mobile (Keyli — cible, rien construit au démarrage)

- Structure cible : voir `docs/STRUCTURE_FRONTEND.md` section Mobile, et la
  table de correspondance Web ↔ Mobile du répertoire de fichiers sources.
- `apps/mobile/src/hooks/`, `services/api/`, `lib/`,
  `integrations/supabase/` DOIVENT rester du code partagé avec le web
  (même logique, portée depuis `src/`) — jamais une réécriture indépendante
  de la même règle métier. Si une règle diverge entre web et mobile, le
  signaler avant de coder plutôt que de laisser diverger silencieusement.
- `apps/mobile/src/services/native/` (caméra, biométrie, push, géolocalisation
  continue) est la seule zone de code réellement spécifique au mobile.
- Pas de Framer Motion ni de dépendance d'animation web (`dashboard-animations.css`
  ne s'applique pas ici) — les animations mobiles utilisent l'API Animated
  ou Reanimated de React Native, à spécifier au moment de la Phase 3.
- Aucune clé secrète en dur — mêmes règles que le web (`docs/STACK.md`).
- Ne pas commencer de code mobile avant la Phase 3 du calendrier
  (`docs/etat_avancement.md` indique la phase en cours) — le web n'est pas
  encore stabilisé avant cette phase.
