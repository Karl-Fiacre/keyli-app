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
- **Projet Supabase distant** : « Keyli App », ref `zcqirdowjussoaevqlbd`
  (région eu-west-3, Paris), relié au dépôt le 2026-10-01 — 2 migrations
  appliquées, 17/17 tests RLS verts sur le distant
- **Base locale** : `npm run db:start` (conteneur Postgres Supabase seul,
  ports par défaut 543xx) — les 2 migrations y passent, 17/17 tests RLS verts

## Fichiers/tables terminés

- [x] `.env` configuré (2026-10-01) — connexion au projet distant vérifiée
- [x] Extension PostGIS — migration `20260928120000_extensions_keyli.sql`
      (2026-09-28, appliquée sur le distant le 2026-10-01)
- [x] `profiles_keyli` + enum `user_role_keyli` + trigger d'inscription +
      RLS + tests pgTAP — migration `20260928120100_profiles_keyli.sql`
      (2026-09-28, appliquée sur le distant le 2026-10-01, tests verts)
- [x] Projet web React/Vite/TypeScript, client Supabase typé
      (`src/integrations/supabase/`) — 2026-09-28
- [x] CI GitHub Actions (lint, build, migrations, tests RLS, contrôle de
      `types.ts`) — `.github/workflows/ci.yml`, 2026-09-28
- [x] `plans_keyli` (+ seed 3 forfaits) — migration
      `20261001120000_plans_keyli.sql`, local + distant (2026-10-01), 12 tests
      pgTAP verts ; lecture anon vérifiée via l'API REST, écriture refusée
- [x] `communes_keyli` / `quartiers_keyli` (+ seed : 13 communes,
      17 quartiers) — migration `20261001130000_communes_quartiers_keyli.sql`,
      local + distant (2026-10-01), 15 tests pgTAP verts ; lecture anon et
      refus d'écriture vérifiés via l'API REST
- [x] `agency_agents_keyli` — migration `20261001150000_agency_agents_keyli.sql`,
      local + distant (2026-10-01), 16 tests pgTAP verts
- [x] Plafond Grande Agence = 30 — migration
      `20261001140000_plafond_grande_agence_keyli.sql` (2026-10-01)
- [x] Rôle `super_admin` — migration `20261002120000_role_super_admin_keyli.sql`
      (2026-10-02) ; droits listés dans `ROLES.md`, à implémenter au module admin
- [x] `properties_keyli` / `property_media_keyli` (+ enums type/statut,
      trigger image principale, archivage) — migration
      `20261002130000_properties_keyli.sql`, local + distant (2026-10-02),
      28 tests pgTAP verts (89 au total)
- [x] `documents_keyli` (+ enums, bucket privé 5 Mo PDF/JPEG/PNG) —
      migration `20261002140000_documents_keyli.sql`, local + distant
      (2026-10-02), 24 tests pgTAP verts (113 au total). Critère Phase 0
      « fichier surdimensionné rejeté côté serveur » prouvé sur le distant
- [x] `subscriptions_keyli` / `transactions_keyli` / `payment_attempts_keyli`
      (+ formule négociée Grande Agence, un seul abonnement actif) —
      migration `20261002150000_abonnements_keyli.sql`, local + distant
      (2026-10-02), 22 tests pgTAP verts (135 au total)
- [x] Limite du forfait à la publication (trigger, journal
      `property_publications_keyli`, RPC `etat_publication_keyli`, accord
      `accepte_depassement`) — migration
      `20261002160000_limite_forfait_publication_keyli.sql`, local + distant
      (2026-10-02), 26 tests pgTAP verts (161 au total)
- [x] `messages_keyli` / `ratings_keyli` / `reports_keyli` (+ enum
      `report_status_keyli`, moyenne par trigger, anti-démarchage) —
      migration `20261002170000_notes_messages_signalements_keyli.sql`,
      local + distant (2026-10-02), 27 tests pgTAP verts (188 au total)
- [x] Module admin : `audit_logs_keyli`, actions sensibles en fonctions SQL
      auditées, lecture admin, `feedback_keyli`, `inscription_pilot_keyli`,
      `onboarding_checklists_keyli`, `marketing_templates_keyli`,
      `signup_attempts_keyli`, registre obligatoire pour publier (KY004) —
      migrations `20261002180000_admin_fondations_keyli.sql` et
      `20261002190000_admin_backoffice_keyli.sql`, local + distant
      (2026-10-02), 47 tests pgTAP verts (235 au total)
- [x] `leads_keyli` / `visits_keyli` (+ enums, lead automatique au premier
      contact, cohérence propriétaire/agent) — migration
      `20261003120000_leads_visites_keyli.sql`, local + distant (2026-10-03),
      23 tests pgTAP verts (258 au total)
- [x] `favorites_keyli` / `search_alerts_keyli` — migration
      `20261003130000_favoris_alertes_keyli.sql`, local + distant
      (2026-10-03), 16 tests pgTAP verts (274 au total)
- [x] `property_interactions_keyli` (+ enum, compteurs, anti-inflation,
      quartier copié) — migration `20261004120000_interactions_keyli.sql`,
      local + distant (2026-10-05), 20 tests pgTAP verts (294 au total).
      **Toutes les tables de `reference/schema_cible_reference.sql` sont
      désormais créées.**
- [x] Profil public : vue `profils_publics_keyli` (« Prénom I. » pour un
      particulier, nom complet pour une agence, visible de tous) — migration
      `20261005120000_profils_publics_keyli.sql`, local + distant
      (2026-10-05), 10 tests pgTAP verts (304 au total)
- [x] Notation après visite effectuée ou lead conclu, une note par personne
      notée — migration `20261005130000_notation_apres_visite_keyli.sql`,
      local + distant (2026-10-05), 11 tests pgTAP verts (315 au total)
- [x] Notifications in-app (`notifications_keyli`) et déclenchement des
      alertes de recherche (critères validés, rayon, 10/jour/alerte) —
      migration `20261005140000_notifications_alertes_keyli.sql`, local +
      distant (2026-10-06), 18 tests pgTAP verts (333 au total)
- [x] Quartiers tendance : table `quartiers_tendance_keyli` recalculée chaque
      nuit (pg_cron), vues `quartiers_populaires_keyli` et
      `tendances_prix_keyli` — migration
      `20261006120000_quartiers_tendance_keyli.sql`, local + distant
      (2026-10-06), 14 tests pgTAP verts (347 au total)
- [x] Modération : retrait de vérification (compte, bien) et suspension de
      compte (connexion bloquée, annonces masquées, écritures bloquées,
      date de fin facultative) — migration
      `20261021120000_moderation_comptes_keyli.sql`, local + distant
      (2026-10-21), 28 tests pgTAP verts (375 au total). **Tous les points
      ouverts du schéma sont tranchés.**
- [x] Nom d'agence (`profiles_keyli.nom_agence`, obligatoire à
      l'inscription, figé après vérification) — migration
      `20261022120000_nom_agence_keyli.sql`, local + distant (2026-10-22),
      11 tests pgTAP verts (386 au total)
- [x] Logo et assets de marque (logotype complet, clé seule, icônes d'app,
      favicon) — vectorisés depuis `design-reference/icons/app_icon_source.png`,
      générés par `docs/keyli_brand_assets/generer.cjs` (2026-10-23)
- [x] **Sprint 1 front-end** (2026-10-23) : Tailwind/Shadcn avec les tokens
      de la charte, routage, mise en page avec logo, inscription (rôle, nom
      d'agence, robustesse), connexion, vérification d'email, mot de passe
      oublié / nouveau, profil — testés de bout en bout sur la pile locale
- [x] **Paiement Paystack (mode test)** (2026-10-23) : migration
      `20261023120000_paiements_paystack_keyli.sql` (local + distant,
      20 tests pgTAP, 406 au total), Edge Functions `handle-paystack-payment`,
      `verify-paystack-payment`, `paystack-webhook`, écrans `/abonnement` et
      `/abonnement/retour`. Secrets posés par le porteur et fonctions
      déployées le 2026-10-25 (signature fausse → 401, appel anonyme → 403).
      **Paiement test de bout en bout réussi le 2026-10-25.**
- [x] Expiration des abonnements (2026-10-25) : rappels in-app J-7 / J-1,
      expiration horaire (pg_cron), annonces masquées à l'échéance sans délai
      de grâce et réaffichées au renouvellement, bandeau sur l'écran
      Abonnement — migration `20261025120000_expiration_abonnements_keyli.sql`,
      local + distant, 18 tests pgTAP (424 au total)

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

- **Site URL / Redirect URLs du projet distant** à renseigner une fois
  l'hébergement choisi (la confirmation d'email est bien active sur le
  distant, vérifié le 2026-10-01).
- **Inscription de bout en bout non testée** : pas encore d'écran
  d'inscription (Sprint 1) ; le trigger est couvert par les tests pgTAP.
- **Ancien dépôt `Karl-Fiacre/keyli`** : un fichier `.env` y est versionné
  (contenu non ouvert). S'il contient autre chose que l'URL et la clé anon
  (clé `service_role` notamment), considérer la clé comme exposée et la
  révoquer côté ancien projet.
- **Vite 5.4 (figé par `STACK.md`)** : failles connues du serveur de
  développement uniquement (traversée de chemin, contournement `fs.deny` sur
  Windows) — correctif seulement en Vite 8 (version majeure). Aucune faille
  sur les dépendances de production. Montée de version à décider.
- **Synchronisation de `profiles_keyli.email`** si l'utilisateur change son
  email dans Supabase Auth — aucun mécanisme pour l'instant.
- **Republication d'une annonce archivée** : doit compter comme nouvelle
  annonce du mois (PRD) — mécanisme à définir avec
  `check-subscription-overage`.
- **Facturation des dépassements et recommandation à 2 mois** : les
  dépassements sont enregistrés avec leur prix ; leur facturation au cycle
  (Edge Function `check-subscription-overage`, Paystack) reste à écrire.
- **Paystack en production** (plus tard) : remplacer `PAYSTACK_SECRET_KEY`
  par la clé `sk_live_…` et `KEYLI_APP_URL` par le domaine de production
  (Dashboard → Edge Functions → Secrets, jamais dans `.env` ni le chat),
  déclarer le webhook
  `https://zcqirdowjussoaevqlbd.supabase.co/functions/v1/paystack-webhook`
  en mode live. Une clé mal saisie est signalée dans
  `payment_attempts_keyli.error_message` (sans révéler la valeur).
- **Droits super_admin restants** : rapports/analyses, litiges, clés API,
  sécurité, textes juridiques (voir ROLES.md).
- **Documents cités mais absents** : `Keyli_Repertoire_Fichiers_Sources_Definitif.docx`,
  `Keyli_Calendrier_Definitif.docx`, `keyli_dashboards_preview.html`.
- **Modèles d'email Auth en anglais** (confirmation, réinitialisation) : à
  traduire dans le Dashboard et `supabase/config.toml`.
- **Redirect URLs du projet distant** : y ajouter l'adresse de l'application
  (http://127.0.0.1:5173 en développement, puis le domaine de production).
- **Emails de notification** : fournisseur d'email à choisir (l'ancien
  pilote utilisait Resend) avant l'Edge Function d'envoi.
- **Mémoire de la machine (Docker)** : 7,9 Go de RAM ; fichier d'échange
  Windows agrandi par le porteur le 2026-10-06 (≈ 7,4 Go), ce qui a rendu
  Docker stable. Le 2026-10-05, avec
  l'accord du porteur : `.wslconfig` limité à 3 Go, conteneurs iic et
  naellys-express arrêtés sans redémarrage automatique. Ne garder que
  `supabase_db_keyli` pendant une session Keyli.
- **Hébergement web non confirmé** — recommandation Cloudflare Pages
  documentée (`docs/MODULES/hebergement-securite.md`), pas actée.
- **Clés Cloudinary** — pas encore transmises, à demander avant le module
  médias.

## Prochaine étape recommandée

1. Phase 0 fusionnée dans `main` le 2026-10-01 (CI verte), `.env` en place ;
   `plans_keyli`, `communes_keyli`/`quartiers_keyli`, `agency_agents_keyli`
   créées le même jour ; plafond Grande Agence fixé à 30.
2. Workflow de migration : `npm run db:reset && npm run db:test` en local,
   puis `npx supabase db push --linked` et
   `npx supabase test db --linked` sur le distant.
3. Suite de la Phase 0 (calendrier) : validation serveur de la taille/format
   des documents uploadés — dépend de `documents_keyli` et du stockage,
   donc du module vérification ; à caler avec le porteur de projet.
4. Schéma, points ouverts, Sprint 1 et paiement Paystack faits (paiement
   test de bout en bout réussi le 2026-10-25), expiration des abonnements
   faite. Suite : facturation des dépassements et recommandation de montée
   de gamme après 2 mois (`check-subscription-overage`).

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

### Session du 2026-10-01 — liaison du projet Supabase distant
- Phase/semaine calendrier : Phase 0
- Fait : dossier relié au projet « Keyli App » (`zcqirdowjussoaevqlbd`) —
  le CLI passe par un rôle de connexion temporaire, aucun mot de passe
  Postgres nécessaire ; schéma `public` distant vérifié vide puis 2
  migrations poussées ; types générés depuis le distant identiques au local
  (hors mise en forme) ; 17/17 tests RLS verts sur le distant et en local.
- Correctif : sur le distant, le rôle temporaire `cli_login_postgres` n'a
  pas USAGE sur le schéma `extensions` (où vit pgTAP) — le test se place
  en `postgres` (`set local role postgres`), comme en local.
- Constat : après un redémarrage de la machine, le conteneur
  `supabase_db_keyli` reste arrêté alors que le CLI le croit actif —
  `docker start supabase_db_keyli` le relance.
- Ensuite : `.env` créé (connexion vérifiée, anon refusé sur
  `profiles_keyli`, confirmation d'email active sur le distant) ; Phase 0
  fusionnée dans `main`, CI verte.

### Session du 2026-10-23 — logo, Sprint 1 front-end, paiement Paystack
- Phase/semaine calendrier : Sprint 1
- Terminés : logo et assets de marque ; Sprint 1 front-end (fusionné) ;
  paiement Paystack en mode test (migration, 3 Edge Functions, écrans
  Abonnement / Retour de paiement), migration poussée sur le distant.
- Décisions : renouvellement = +1 mois depuis la fin actuelle ; changement
  de forfait immédiat, sans prorata ; compte Paystack CI en XOF.
- En attente : secrets Paystack (porteur), déploiement des fonctions,
  paiement test ; fournisseur d'email reporté par le porteur.
- Prochaine étape : voir « Prochaine étape recommandée ».
- 2026-10-25 : paiement test Paystack réussi (secrets d'abord inversés,
  lecture des secrets fiabilisée) ; expiration des abonnements (décisions :
  annonces masquées, pas de grâce, rappels J-7/J-1, pg_cron).

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
