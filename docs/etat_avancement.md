# État d'avancement — Keyli

**Ce fichier doit être mis à jour à la fin de chaque session de travail
avec Claude Code.** C'est le seul mécanisme fiable pour qu'une session
future sache exactement où reprendre — ne pas se fier à la mémoire de la
conversation précédente, elle ne persiste pas.

---

## Statut actuel

- **Phase du calendrier en cours** : Phase 0 — Fondations (voir
  `Keyli_Calendrier_Definitif.docx`, semaines 1-3), pas encore commencée
- **Dernière session de travail** : 2026-09-28 — correction de la
  documentation uniquement, aucun code (voir historique plus bas)
- **Dépôt Git** : à créer par le porteur de projet
- **Projet Supabase** : créé, vide (aucune table) — URL et clé anon déjà
  transmises, à placer dans `.env` selon `docs/SETUP.md`
- **PostGIS** : à vérifier/activer à la première connexion au projet

## Fichiers/tables terminés

*(aucun pour l'instant — cocher au fur et à mesure, avec la date)*

- [ ] `.env` configuré
- [ ] Extension PostGIS activée
- [ ] `profiles_keyli`
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

- Aucune pour l'instant — toutes les décisions structurantes connues à ce
  jour sont déjà intégrées dans `docs/DATABASE.md` et les modules.

## Blocages / questions en attente

- **Hébergement web non confirmé** — recommandation Cloudflare Pages
  documentée (`docs/MODULES/hebergement-securite.md`), pas actée.
- **Clés Paystack et Cloudinary** — pas encore transmises, à demander avant
  le module pricing/médias.
- **Calcul de tendance de quartier** (fenêtre de temps, fréquence de
  recalcul) — non tranché, voir `docs/MODULES/quartiers-tendance.md`.
- **Logotype SVG complet** — pas encore livré en fichier source unique, voir
  `docs/LOGO.md` "Assets à créer".

## Prochaine étape recommandée

Démarrer Phase 0 : créer le dépôt Git, initialiser le projet
React/Vite/TypeScript (ou récupérer l'existant), connecter le projet
Supabase (`docs/SETUP.md` étapes 1 à 5), activer PostGIS.

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
