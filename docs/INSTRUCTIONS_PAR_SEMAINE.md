# Instructions par semaine — Keyli

Blocs copiables-collables en début de semaine, dérivés de
`Keyli_Calendrier_Definitif.docx` / `calendrier.md`. Copier le bloc de la
semaine en cours dans Claude Code, après le message d'initialisation
standard (`docs/INSTRUCTIONS_CLAUDE_CODE.md`).

## Phase 0 — Fondations

### Semaine 1-3 — Sprint 0 : Isolation Supabase & durcissement
```
Semaine 1-3 (Phase 0). Objectif : projet Supabase dédié isolé et sécurisé,
prêt pour le développement fonctionnel.
Lire d'abord : docs/SETUP.md, docs/DATABASE.md.
Tâches de la semaine :
- Vérifier .env configuré (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Activer l'extension PostGIS
- Créer les premières tables selon l'ordre de reference/schema_cible_reference.sql
  (extensions/enums → profiles_keyli), avec RLS + policies dans la même migration
- Mettre en place le pipeline CI de base (build + lint)
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

## Phase 1 — Finalisation Web & Lancement Pilote

### Semaine 4-6 — Sprint 1 : Parcours propriétaire/agence
```
Semaine 4-6 (Phase 1). Lire d'abord : docs/MODULES/auth.md,
docs/MODULES/verification.md, docs/MODULES/pricing.md.
Tâches : vérification documentaire de bout en bout, abonnement/paiement
Paystack fiable, publication d'annonce sans blocage technique.
Rappel pricing : plans_keyli (Option B) — pas d'enum, seuils/prix en
données. Ne pas coder de facturation avant d'avoir créé et peuplé cette
table (voir DATABASE.md).
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 7-8 — Sprint 2 : Parcours locataire/acheteur
```
Semaine 7-8 (Phase 1). Lire d'abord : docs/MODULES/annonces.md,
docs/MODULES/messagerie.md, docs/MODULES/notation.md.
Tâches : recherche, contact (AUCUN paywall — voir PRD_REGLES.md), notation
post-transaction.
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 9-10 — Sprint 3 : Back-office admin
```
Semaine 9-10 (Phase 1). Lire d'abord : docs/MODULES/admin.md.
Tâches : file de vérification, modération, analytics de base.
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 11-19 — Sprints 3bis : Dashboards enrichis
```
Semaine [11-19, préciser laquelle] (Phase 1). Lire d'abord :
docs/KEYLI_DASHBOARD_DESIGN_SPEC.md, docs/DESIGN_SYSTEM.md,
docs/ANIMATIONS.md, docs/MODULES/dashboard.md.
Ordre de dépendance des fichiers à respecter (voir
docs/reference/schema_cible_reference.sql en-tête et
Keyli_Calendrier_Codage_Prioritaire d'origine, désormais fusionné ici) :
animations/hooks fondation → primitives visuelles → shell → composites →
assemblage des pages → AgencyDashboard.tsx (nouvelle page).
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 20-25 — Sprints 4-6 : Onboarding, lancement, stabilisation pilote
```
Semaine [20-25, préciser laquelle] (Phase 1). Lire d'abord :
docs/PRD_REGLES.md section KPIs pilote.
Tâches : onboarding des 500 propriétés cibles, lancement effectif,
correction des problèmes réels remontés par le pilote.
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

## Phase 2 — Consolidation

### Semaine 26-35 — Sprints 7-10 : Ouverture publique, conversion, paiements, extraction logique
```
Semaine [26-35, préciser laquelle] (Phase 2). Lire d'abord :
docs/MODULES/pricing.md, docs/DATABASE_LOGIC.md.
Tâches : ouverture au marché grand public, optimisation du taux annonce→
contact, fiabilisation des paiements (relances/échecs), extraction de la
logique métier partageable (hooks/services indépendants de l'UI) en vue du
mobile — voir docs/STRUCTURE_FRONTEND.md pour ce qui doit rester partageable.
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 36-37 — Sprints 11-12 : Stabilisation pré-mobile
```
Semaine 36-37 (Phase 2, fin). Lire d'abord : docs/CONVENTIONS.md,
docs/DATABASE.md (revue de sécurité RLS).
Tâches : revue de sécurité, nettoyage de dette technique avant d'attaquer
le mobile — aucun bug bloquant connu ne doit rester ouvert avant la
Phase 3.
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

## Phase 3 — Mobile React Native

⚠️ Ne pas commencer cette phase avant que la Phase 2 soit réellement
terminée (voir `.claude/rules/react-native-mobile.md`) — le mobile
partage la logique du web, un web instable se propage au mobile.

### Semaine 38-40 — Sprint 13 : Socle du projet mobile
```
Semaine 38-40 (Phase 3). Lire d'abord : docs/STRUCTURE_FRONTEND.md
(section Mobile), docs/STACK.md, .claude/rules/react-native-mobile.md,
docs/MODULES/mobile.md.
Tâches : projet Expo initialisé et connecté au projet Supabase Keyli,
navigation de base (stack + tabs), authentification fonctionnelle sur
mobile, stockage sécurisé du token (Keychain iOS / Keystore Android).
Réutiliser directement src/integrations/supabase/client.ts et les hooks
déjà extraits en Phase 2 — ne pas réécrire une logique déjà partageable.
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 41-43 — Sprint 14 : Catalogue et recherche
```
Semaine 41-43 (Phase 3). Lire d'abord : docs/MODULES/annonces.md,
docs/MODULES/geolocalisation.md, docs/MODULES/quartiers-tendance.md.
Tâches : liste, filtres, carte des annonces sur mobile (recherche mobile
fonctionnelle avec carte native). Rappel : la recherche par rayon dépend de
PostGIS, déjà tranché côté schéma — voir DATABASE.md.
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 44-46 — Sprint 15 : Publication d'annonce mobile
```
Semaine 44-46 (Phase 3). Lire d'abord : docs/MODULES/annonces.md,
docs/MODULES/verification.md.
Tâches : création d'annonce avec capture photo native (module caméra —
voir docs/MODULES/mobile.md pour les modules natifs requis).
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 47-48 — Sprint 16 : Vérification documentaire mobile
```
Semaine 47-48 (Phase 3). Lire d'abord : docs/MODULES/verification.md,
docs/MODULES/mobile.md (section biométrie).
Tâches : scan de pièce via caméra, connexion biométrique (Face ID /
empreinte). Le contrôle humain admin reste systématique — la biométrie ne
remplace que la connexion, pas la vérification documentaire elle-même.
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 49-51 — Sprint 17 : Paiements et notifications push
```
Semaine 49-51 (Phase 3). Lire d'abord : docs/MODULES/pricing.md,
docs/MODULES/mobile.md (section notifications push).
Tâches : abonnement mobile (Paystack), notifications push (nouveau
message, statut vérification, expiration abonnement — voir
docs/ANIMATIONS.md point 8 pour l'effet de la cloche, non applicable tel
quel sur mobile, à adapter en notification système).
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 52-53 — Sprint 18 : Bêta interne
```
Semaine 52-53 (Phase 3). Lire d'abord : docs/MODULES/mobile.md (section
distribution bêta).
Tâches : tests via TestFlight (iOS) et Play Internal Testing (Android),
10-15 testeurs réels pendant une semaine.
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 54-55 — Sprint 19 : Corrections pré-soumission
```
Semaine 54-55 (Phase 3). Tâches : correction des retours bêta, conformité
aux guidelines Apple/Google (voir docs/MODULES/mobile.md).
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

### Semaine 56-58 — Sprint 20 : Soumission et publication
```
Semaine 56-58 (Phase 3, fin). Lire d'abord : docs/MODULES/mobile.md
(section soumission stores).
Tâches : soumission App Store et Play Store, gestion des retours de
review. ⚠️ Délai hors de notre contrôle (quelques jours à plusieurs
semaines, risque de rejet) — ne pas considérer cette phase terminée tant
que la publication n'est pas confirmée sur les deux stores.
Fin de semaine : mettre à jour docs/etat_avancement.md.
```

## Phases 4 et 5

Le détail sprint par sprint de l'Expansion nationale (Sem. 59-71) et de
l'Expansion régionale (Sem. 72-87+) est dans `calendrier.md` — blocs à
ajouter ici au fur et à mesure qu'on s'en approche. Contrairement aux
Phases 2-3, ces deux phases dépendent de résultats du pilote et de
l'expansion qui n'existent pas encore (villes cibles, décision d'expansion
pays) — les pré-rédiger maintenant serait plus qu'un risque d'obsolescence,
ce serait écrire des instructions pour des décisions pas encore prises.
