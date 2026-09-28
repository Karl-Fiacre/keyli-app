# État d'avancement — Keyli

**Ce fichier doit être mis à jour à la fin de chaque session de travail
avec Claude Code.** C'est le seul mécanisme fiable pour qu'une session
future sache exactement où reprendre — ne pas se fier à la mémoire de la
conversation précédente, elle ne persiste pas.

---

## Statut actuel

- **Phase du calendrier en cours** : Phase 0 — Fondations (semaines 1-3),
  en cours — branche `feature/phase-0-fondations`
- **Dernière session de travail** : 2026-09-28 (voir historique plus bas)
- **Dépôt Git** : nouveau projet, dépôt privé
  https://github.com/Karl-Fiacre/keyli-app (`Karl-Fiacre/keyli` = ancien
  pilote, conservé comme référence, ne rien y pousser)
- **Projet Supabase distant** : créé, vide — **pas encore relié au dépôt**,
  aucune migration poussée (voir blocages)
- **Base locale** : `npm run db:start` (conteneur Postgres Supabase seul,
  ports par défaut 543xx) — les 2 migrations y passent, 17/17 tests RLS verts

## Fichiers/tables terminés

- [ ] `.env` configuré (en attente de l'URL et de la clé anon)
- [x] Extension PostGIS — migration `20260928120000_extensions_keyli.sql`
      (2026-09-28, local uniquement, pas encore sur le projet distant)
- [x] `profiles_keyli` + enum `user_role_keyli` + trigger d'inscription +
      RLS + tests pgTAP — migration `20260928120100_profiles_keyli.sql`
      (2026-09-28, local uniquement, pas encore sur le projet distant)
- [x] Projet web React/Vite/TypeScript, client Supabase typé
      (`src/integrations/supabase/`) — 2026-09-28
- [x] CI GitHub Actions (lint, build, migrations, tests RLS, contrôle de
      `types.ts`) — `.github/workflows/ci.yml`, 2026-09-28
- [ ] `plans_keyli` (+ seed 3 forfaits)
- [ ] `communes_keyli` / `quartiers_keyli` (+ seed)
- [ ] `agency_agents_keyli`
- [ ] `properties_keyli` / `property_media_keyli`

*(Liste complète dans `Keyli_Repertoire_Fichiers_Sources_Definitif.docx` et
`docs/reference/schema_cible_reference.sql` — copier la section du module en
cours ici au fur et à mesure plutôt que dupliquer toute la liste dès
maintenant.)*

## Décisions prises en cours de développement

*(Toute décision qui précise ou complète un fichier `docs/` sans y être
encore reportée doit être notée ici temporairement, puis intégrée au fichier
concerné le jour même.)*

Toutes les décisions du 2026-09-28 sont déjà reportées dans les fichiers
concernés :
- Nouveau projet, pas de reprise de l'ancien pilote → `INDEX.md`,
  `STACK.md`, `STRUCTURE_BACKEND.md`, `STRUCTURE_FRONTEND.md`
- Sécurité de `profiles_keyli` (trigger + colonnes verrouillées) →
  `DATABASE.md`, `ROLES.md`, `MODULES/auth.md`
- Tests RLS en pgTAP sur Postgres local, rejoués en CI → `SETUP.md`,
  `CONVENTIONS.md`

## Blocages / questions en attente

- **Projet Supabase distant non relié** — à faire par le porteur de projet
  (identifiants personnels, jamais transmis dans le chat) :
  `npx supabase login` puis `npx supabase link --project-ref <ref>` (mot de
  passe Postgres saisi directement dans le terminal). Ensuite, Claude Code
  peut pousser les migrations (`npx supabase db push`).
- **`.env`** — URL du projet et clé anon à transmettre (ou à placer soi-même
  dans `.env` depuis `.env.example`).
- **Ancien dépôt `Karl-Fiacre/keyli`** : un fichier `.env` y est versionné
  (contenu non ouvert). S'il contient autre chose que l'URL et la clé anon
  (clé `service_role` notamment), considérer la clé comme exposée et la
  révoquer côté ancien projet.
- **Vite 5.4 (figé par `STACK.md`)** : failles connues du serveur de
  développement uniquement (traversée de chemin, contournement `fs.deny` sur
  Windows) — correctif seulement en Vite 8 (version majeure). Aucune faille
  sur les dépendances de production. Montée de version à décider.
- **Lecture publique d'un profil** (nom du propriétaire, note moyenne sur
  une annonce) — non autorisée pour l'instant, à décider avec les modules
  annonces/notation.
- **Synchronisation de `profiles_keyli.email`** si l'utilisateur change son
  email dans Supabase Auth — aucun mécanisme pour l'instant.
- **Forfaits (à régler au module pricing)** : `grande_agence` a
  `seuil_max = NULL` mais un `prix_depassement_unitaire` (jamais
  applicable) ; `agence_moyenne` n'a pas de prix de dépassement —
  comportement à la 11e annonce non documenté.
- **Documents cités mais absents** : `Keyli_Repertoire_Fichiers_Sources_Definitif.docx`,
  `Keyli_Calendrier_Definitif.docx`, `keyli_dashboards_preview.html`.
- **Hébergement web non confirmé** — recommandation Cloudflare Pages
  documentée (`docs/MODULES/hebergement-securite.md`), pas actée.
- **Clés Paystack et Cloudinary** — pas encore transmises, à demander avant
  le module pricing/médias.
- **Calcul de tendance de quartier** (fenêtre de temps, fréquence de
  recalcul) — non tranché, voir `docs/MODULES/quartiers-tendance.md`.
- **Logotype SVG complet** — pas encore livré en fichier source unique, voir
  `docs/LOGO.md` "Assets à créer".

## Prochaine étape recommandée

1. Relier le projet Supabase distant (voir blocage ci-dessus), pousser les
   2 migrations, configurer `.env`, vérifier l'inscription de bout en bout.
2. Fusionner `feature/phase-0-fondations` dans `main` une fois la CI verte
   et les migrations en place sur le projet distant.
3. Suite de la Phase 0 (calendrier) : validation serveur de la taille/format
   des documents uploadés — dépend de `documents_keyli` et du stockage,
   donc du module vérification ; à caler avec le porteur de projet.
4. Puis `plans_keyli` (+ seed), `communes_keyli`/`quartiers_keyli` (+ seed),
   `agency_agents_keyli`, `properties_keyli` — ordre de
   `reference/schema_cible_reference.sql`.

---

## Historique des sessions

### Session du 2026-09-28
- Phase/semaine calendrier : Phase 0, avant Sem. 1 (relecture de la
  documentation)
- Fichiers/tables terminés cette session : aucun fichier de code, aucune
  table. Trois contradictions de documentation corrigées :
  1. `PRD_REGLES.md` (géolocalisation) disait la recherche par rayon
     bloquée faute d'extension géospatiale — aligné sur la décision PostGIS
     actée ; note « ancien schéma » de `DATABASE.md` (`geolocation`)
     complétée dans le même sens
  2. `PRD_REGLES.md` (pricing) parlait encore d'une migration de l'enum
     `subscription_plan_keyli` — remplacé par la règle `plans_keyli`
  3. `ANIMATIONS.md` disait `dashboard-animations.css` « déjà livré » —
     corrigé en « à créer » (Phase 1, Sem. 11), cohérent avec
     `STRUCTURE_FRONTEND.md` et `calendrier.md`
  4. Notation (`PRD_REGLES.md`, `MODULES/notation.md`) : contrainte UNIQUE
     et policy de lecture publique présentées comme « déjà en place » —
     reformulées en « à créer avec la table » ; `rating_avg` : trigger vs
     recalcul applicatif à choisir explicitement (demander)
  5. Quartiers tendance (`PRD_REGLES.md`, `DATABASE.md`) : source de
     tracking passée de `signup_attempts_keyli` à
     `property_interactions_keyli`, conformément à
     `MODULES/analytics-tracking.md` (le PRD ne tranche pas, il renvoie à
     la doc Claude Code)
  6. `DESIGN_SYSTEM.md` : `--pending` renvoyait à `dashboard-animations.css`
     — renvoie désormais au token de `src/index.css`
  7. Durée max des animations : `ANIMATIONS.md` disait 500-600ms et
     compteur 600-700ms — aligné sur la spec (500ms, seule exception le
     compteur KPI à 600ms) ; exception ajoutée aussi dans
     `KEYLI_DASHBOARD_DESIGN_SPEC.md` 5.2, qui se contredisait (max 500ms
     mais compteur 600ms en 5.3)
- Fichiers/tables en cours (non terminés) : aucun
- Décisions prises : aucune nouvelle décision — uniquement de l'alignement
  sur des décisions déjà actées
- Blocages rencontrés :
  - Le paquet de documentation n'est pas dans un dépôt Git et ses fichiers
    sont à la racine de `keyli_docs/`, alors que tous les renvois pointent
    vers `docs/` — à placer dans `docs/` du futur dépôt (`CLAUDE.md` et
    `.claude/` à la racine)
  - Non tranché : nouveau projet React/Vite/TypeScript ou reprise du code
    de l'ancien pilote (`STRUCTURE_BACKEND.md`/`STRUCTURE_FRONTEND.md`
    décrivent comme « existants » 32 migrations, 14 Edge Functions et
    27 pages de l'ancien pilote, absents de ce paquet)
  - Documents cités mais absents du paquet :
    `Keyli_Repertoire_Fichiers_Sources_Definitif.docx`,
    `Keyli_Calendrier_Definitif.docx`, `keyli_dashboards_preview.html`
  - À régler au module pricing : `grande_agence` a `seuil_max = NULL` mais
    un `prix_depassement_unitaire` (jamais applicable) ; `agence_moyenne`
    n'a pas de prix de dépassement — comportement à la 11e annonce non
    documenté
- Prochaine étape recommandée : trancher nouveau projet vs reprise de
  l'existant, puis démarrer la Phase 0 (`SETUP.md` étapes 1 à 5, PostGIS),
  puis `profiles_keyli` avec `MODULES/auth.md`

### Session du 2026-09-28 (suite) — démarrage de la Phase 0
- Phase/semaine calendrier : Phase 0, Sem. 1
- Fichiers/tables terminés cette session :
  - Dépôt Git créé (`Keyli/keyli` en local, `Karl-Fiacre/keyli-app` sur
    GitHub) ; paquet de documentation importé dans `docs/`, `CLAUDE.md` et
    `.claude/` à la racine
  - Projet web React 18.3 / Vite 5.4 / TypeScript 5.8 (versions de
    `STACK.md`), alias `@/`, client Supabase typé
  - Supabase CLI (dépendance npm), config locale (confirmation d'email
    obligatoire, redirections port 5173)
  - Migrations : PostGIS ; `user_role_keyli` + `profiles_keyli` + triggers
    (`set_updated_at_keyli`, `handle_new_user_keyli`) + RLS + privilèges
    par colonne
  - Tests pgTAP `supabase/tests/profiles_keyli_rls.test.sql` : 17/17 verts
    en local
  - `src/integrations/supabase/types.ts` généré depuis la base locale
  - CI GitHub Actions
- Fichiers/tables en cours (non terminés) : migrations non poussées sur le
  projet distant (projet pas encore relié) ; `.env` non configuré
- Décisions prises (porteur de projet) : nouveau projet ; sécurité de
  `profiles_keyli` par trigger + colonnes verrouillées ; tests RLS pgTAP
  sur Postgres local et en CI ; dépôt GitHub `keyli-app` (le nom `keyli`
  est pris par l'ancien pilote)
- Constats techniques :
  - Un trigger s'exécute même si l'appelant n'a pas le droit EXECUTE sur sa
    fonction (vérifié) — le retrait de ce droit sur les fonctions de trigger
    ne casse donc pas l'inscription
  - Le rôle `postgres` des tests ne peut pas endosser `supabase_auth_admin` :
    les tests simulent l'inscription par insertion directe dans `auth.users`
  - `supabase gen types` (CLI 2.118) produit un fichier non formaté : ne pas
    le reformater, la CI compare la sortie brute
  - La machine a peu de RAM libre et d'autres projets tournent dans Docker :
    ne démarrer que le Postgres (`db:start`), pas le stack complet
- Blocages rencontrés : voir « Blocages / questions en attente » (liaison
  du projet distant, `.env`, `.env` versionné dans l'ancien dépôt, Vite 5)
- Prochaine étape recommandée : voir « Prochaine étape recommandée »
  ci-dessus

---

## Modèle à copier pour chaque nouvelle entrée de session

```
### Session du [date]
- Phase/semaine calendrier : [Phase X, Sem. Y]
- Fichiers/tables terminés cette session : [liste]
- Fichiers/tables en cours (non terminés) : [liste + état précis]
- Décisions prises : [le cas échéant]
- Blocages rencontrés : [le cas échéant]
- Prochaine étape recommandée : [phrase claire pour la session suivante]
```
