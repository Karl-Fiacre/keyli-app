# Guide d'utilisation Claude Code — Keyli

## Avant chaque session
```bash
cd keyli
claude
```

## Message d'initialisation (à copier-coller en premier)
```
Lis docs/INDEX.md entièrement, puis dans cet ordre :
docs/etat_avancement.md → docs/SETUP.md → docs/PRD_REGLES.md → docs/DATABASE.md →
docs/DATABASE_LOGIC.md → docs/CONVENTIONS.md →
docs/STRUCTURE_BACKEND.md → docs/STRUCTURE_FRONTEND.md → docs/ANIMATIONS.md

Règles non négociables :
1. Le projet Supabase est VIDE — aucune table n'existe. Créer les tables une
   à une, module par module (voir docs/SETUP.md et docs/MODULES/README.md
   pour l'ordre) — ne jamais exécuter docs/reference/schema_cible_reference.sql
   en bloc, il sert uniquement de référence du schéma cible
2. Tables/enums canoniques suffixées _keyli UNIQUEMENT — jamais les versions
   non suffixées (voir docs/DATABASE.md, section historique)
3. RLS activée ET policies écrites dans la même migration, jamais l'une sans
   l'autre
4. Commentaires de code en français
5. Ne jamais coder un dashboard en JSX monolithique — composer à partir de
   src/components/dashboard/ (voir docs/STRUCTURE_FRONTEND.md)
6. Logo et badge de vérification sont deux assets distincts — voir docs/LOGO.md
7. Forfaits : table plans_keyli (pas d'enum) — voir docs/MODULES/pricing.md

Demande-moi confirmation avant toute décision architecturale non documentée.
```

## Règles d'utilisation
- Toujours lire le MODULES/*.md du module en cours avant d'écrire du code
  (couverture actuelle : voir MODULES/README.md — incomplet, demander si un
  module nécessaire n'est pas encore détaillé)
- Toujours vérifier DATABASE.md avant d'écrire une requête sur une table
  existante — ne pas supposer une colonne non confirmée
- Ne jamais utiliser une table/enum non suffixée `_keyli`
- Regénérer `src/integrations/supabase/types.ts` après toute migration
- Tester le cas RLS (un utilisateur ne peut pas lire/modifier les données
  d'un autre) après chaque nouvelle policy
- **En fin de session, mettre à jour `docs/etat_avancement.md`** avant de
  terminer — fichiers/tables créés, décisions prises, blocages, prochaine
  étape. C'est la seule façon fiable qu'une session future reprenne où
  celle-ci s'est arrêtée.

## Ce qui n'est pas encore couvert par ce paquet de documentation
- Spécification technique complète de l'algorithme de quartiers tendance —
  MODULES/quartiers-tendance.md liste surtout des questions ouvertes
  (fenêtre de calcul, fréquence), volontairement, pas une implémentation
- Mobile React Native : structure cible et conventions connues
  (STRUCTURE_FRONTEND.md, .claude/rules/react-native-mobile.md), mais pas de
  MODULES/*.md mobile-spécifique pour l'instant — pas nécessaire avant la
  Phase 3 du calendrier
- Hébergement web non confirmé (Cloudflare Pages recommandé, pas acté) —
  voir MODULES/hebergement-securite.md
- Logotype SVG complet (fichier source unique) non livré — voir LOGO.md
  "Assets à créer"
