# État d'avancement — Keyli

**Ce fichier doit être mis à jour à la fin de chaque session de travail
avec Claude Code.** C'est le seul mécanisme fiable pour qu'une session
future sache exactement où reprendre — ne pas se fier à la mémoire de la
conversation précédente, elle ne persiste pas.

---

## Statut actuel

- **Phase en cours** : Phase 3 — application mobile (`apps/mobile`, Expo
  SDK 58, identifiant `com.keyli.app`). Sprint 13 (socle) terminé le
  2026-11-08, Sprint 14 (catalogue mobile) terminé le 2026-11-09, à
  essayer sur le téléphone ; web terminé jusqu'au Sprint 11-12.
  Le détail par sprint est dans « Blocages / questions en attente » (entrées
  « Sprint N ») et dans `docs/MODULES/`.
- **Dernière session de travail** : 2026-11-26 (soumissions stores, compte Keyli Démo, animations expressives du web)
- **Dépôt Git** : dépôt privé
  https://github.com/Karl-Fiacre/keyli-app (`Karl-Fiacre/keyli` = ancien
  pilote, conservé comme référence, ne rien y pousser)
- **Projet Supabase distant** : « Keyli App », ref `zcqirdowjussoaevqlbd`
  (région eu-west-3, Paris)
- **Site en ligne** : https://keyli-2gc.pages.dev (Cloudflare Pages,
  `npm run deploy` par le porteur)
- **Base locale** : `npx supabase start` ; tests `npx supabase test db`
  (45 fichiers, 823 tests au 2026-11-12) ; tests unitaires `npm test` (60)
- **Mobile** : `cd apps/mobile`, `npx expo start --port 8082` (Node 22.13+,
  Expo Go sur le téléphone du porteur) — `docs/MODULES/mobile.md`

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
- [x] Facturation des dépassements (2026-10-26) : seuil compté par cycle
      mensuel (correctif), clôture horaire des cycles, dépassement mensuel
      ajouté au prochain paiement Paystack, recommandation à 2 mois,
      dépassements affichés sur l'écran Abonnement — migration
      `20261026120000_facturation_depassements_keyli.sql`, local + distant,
      27 tests pgTAP (451 au total)
- [x] Publication d'annonce (2026-10-27) : écrans `/annonces/nouvelle`
      (compteur du forfait, accord de dépassement, avantages, point GPS
      Mapbox / ma position) et `/annonces` ; avantages en liste fermée,
      publication atomique — migration
      `20261027120000_avantages_publication_keyli.sql`, 18 tests pgTAP
      (469 au total) ; Edge Function `get-mapbox-token`. **Reste** : jeton
      Mapbox à poser par le porteur, photos (clés Cloudinary)
- [x] **Sprint 2 — recherche et fiche d'annonce** (2026-10-28) : `/recherche`
      (filtres dans l'URL, tri vérifiées d'abord, pagination), `/annonce/:id`
      (caractéristiques, avantages, annonceur, vue enregistrée), premier
      message à l'annonceur — migration
      `20261028120000_recherche_annonces_keyli.sql`, 16 tests pgTAP (485 au
      total). **Reste du Sprint 2** : messagerie (boîte de réception,
      réponses), favoris, notation après visite
- [x] **Messagerie** (2026-10-29) : `/messages` (conversations, fil,
      réponses, lecture), temps réel Supabase, pastille des non-lus —
      migration `20261029120000_messagerie_keyli.sql`, 11 tests pgTAP
- [x] **Favoris** (2026-10-30) : cœur sur cartes et fiche, page `/favoris`,
      clic tracé (`click_favorite`) — aucun changement de base
- [x] **Visites et avis** (2026-10-30) : planification depuis la
      conversation, suivi côté chercheur avec notifications, lead qui
      avance, avis note + commentaire après visite, avis sur la fiche —
      migration `20261030120000_visites_notation_keyli.sql`, 22 tests
      pgTAP. **Sprint 2 (parcours chercheur) terminé côté fonctionnel.**
- [x] **Back-office admin — Sprint 3, semaines 9-10** (2026-11-01) :
      `/admin` (indicateurs du pilote avec les cibles du PRD, files en
      attente, activité 30 j), `/admin/verifications` (ouvrir le document
      par URL signée, approuver, rejeter avec motif), `/admin/signalements`
      (examiner, résoudre, retirer la vérification du bien, suspendre
      l'annonceur) ; côté utilisateur : envoi des pièces (profil) et de
      l'ACD (Mes annonces), « Signaler cette annonce » (motif en liste) ;
      notification de l'utilisateur à chaque décision — migration
      `20261101120000_backoffice_admin_keyli.sql`, 19 tests pgTAP (543 au
      total). Premier super_admin : procédure manuelle (`SETUP.md`).
      Testé dans le navigateur (pile locale) sauf envoi / ouverture des
      fichiers (stockage non lancé en local).
- [x] **Cloche de notifications** (2026-10-31) : pastille des non lues,
      panneau des 20 dernières, clic = lue + page concernée, « tout
      marquer comme lu », temps réel + oscillation ;
      `src/styles/dashboard-animations.css` créé — migration
      `20261031120000_notifications_temps_reel_keyli.sql`, 6 tests pgTAP

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
- **Tailwind 3.4** : `npm audit` signale une faille modérée de
  `postcss-selector-parser` (lenteur possible à la compilation, aucun impact
  sur le site publié), sans correctif publié pour Tailwind 3 — à revoir avec
  une future montée vers Tailwind 4.
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
- **Modèles d'email Auth** : traduits en français dans le dépôt
  (`supabase/config.toml`, `supabase/templates/`) ; reste à les recopier
  dans le tableau de bord du projet distant (porteur,
  `docs/MISE_EN_PRODUCTION.md`, étape 4).
- **Redirect URLs du projet distant** : y ajouter l'adresse de l'application
  (http://127.0.0.1:5173 en développement, puis le domaine de production).
- **Mémoire de la machine (Docker)** : 7,9 Go de RAM ; fichier d'échange
  Windows agrandi par le porteur le 2026-10-06 (≈ 7,4 Go), ce qui a rendu
  Docker stable. Le 2026-10-05, avec
  l'accord du porteur : `.wslconfig` limité à 3 Go, conteneurs iic et
  naellys-express arrêtés sans redémarrage automatique. Ne garder que
  `supabase_db_keyli` pendant une session Keyli.
- **Site en ligne, à finaliser** — Cloudflare Pages acté et déployé le
  2026-11-01 : https://keyli-2gc.pages.dev (`npm run deploy`). Reste :
  secret `KEYLI_APP_URL=https://keyli-2gc.pages.dev` à poser par le porteur
  (retour après paiement Paystack), achat d'un domaine (la
  Content-Security-Policy est en place depuis le Sprint 6). Détail :
  `docs/MODULES/hebergement-securite.md`.
- **Sprint 18 — bêta** (2026-11-12, branche `feature/beta-mobile`) —
  écran « Donner mon avis » sur mobile (retours et réponses de l'équipe,
  version de l'app jointe au message, `src/partage/lib/retours.ts`,
  3 tests) ; notification « réponse à votre retour » → cet écran ; flux
  Codemagic `android-play-interne` (AAB signé par la clé `keyli_upload`,
  piste test interne en brouillon). Choix du porteur : lien public
  TestFlight, compte Play Console existant.
  **Android en test interne le 2026-11-13** : application Keyli
  (`com.keyli.app`) créée dans le compte Play NAËLLYS EXPRESS (transfert
  vers un compte Nguessan-IT prévu plus tard) ; clé d'envoi `keyli_upload`
  (Codemagic, compte personnel, propre à Keyli) ; compte de service
  `codemagic-play@keyli-48de1.iam.gserviceaccount.com` (projet Google Cloud
  `keyli-48de1`, aucun rôle Cloud ; dans la Play Console : Keyli seulement,
  lecture seule + « Déployer sur des canaux de test », aucun droit de
  production) ; API Google Play Android Developer activée. Les variables
  globales Codemagic étant réservées aux équipes, le groupe
  `keyli_google_play` (`GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`) est dans les
  variables de l'application keyli-app, comme `keyli_mobile`. Version
  **0.1.0 (1)** publiée en test interne pour la liste « Testeurs Keyli »
  (le porteur et son frère). **Reste** : essai Android par le porteur
  (paiement Paystack, push Google, caméra — jamais essayés sur un vrai
  téléphone), compilation TestFlight n° 6 (« Donner mon avis »), groupe
  externe TestFlight et relecture bêta (`docs/MODULES/mobile.md`,
  « Distribution bêta »), puis une semaine de test par 10 à 15 testeurs.
- **Sprint 17 — abonnement et notifications push mobiles** (2026-11-12,
  branche `feature/paiement-push-mobile`) — écran `Abonnement` (Profil) :
  Android choisit et paie le forfait (Paystack dans le navigateur intégré,
  vérification au retour), iPhone affiche seulement (règle Apple 3.1.1).
  Push directs Apple + Google : migration
  `20261118120000_notifications_push_keyli.sql` (`appareils_push_keyli`,
  file `pushs_sortants_keyli`, tâche `keyli-envoi-pushs`, 23 tests pgTAP),
  Edge Function `envoyer-pushs`, modules `expo-notifications` et
  `expo-web-browser`, ouverture de l'écran voulu au toucher
  (`src/partage/lib/push.ts`, 4 tests). Configuration faite le même jour
  par le porteur : Push Notifications et clé APNs Apple, profil régénéré
  (`keyli_app_store_push` dans Codemagic), projet Firebase `keyli-48de1`,
  secrets APNs et FCM posés, migration et fonction déployées. Compilation
  TestFlight **#5** réussie et envoyée à Apple (Sprints 15 à 17).
  **Prochaine étape : essai du porteur sur iPhone** (liste dans
  `docs/MODULES/mobile.md`, Sprint 17), puis Sprint 18 (bêta, dont le flux
  de compilation Android).
- **Sprint 16 — vérification documentaire mobile et verrou biométrique**
  (2026-11-11, branche `feature/verification-mobile`) — écran
  `Verification` (Profil, propriétaire et agence) : pièces du compte et ACD
  par bien, envoi par caméra, galerie ou PDF avec aperçu, statut et motif de
  refus ; hook partagé `useEnvoyerDocument` généralisé (`FichierDocument`),
  règles dans `src/partage/lib/documents.ts` (4 tests), web rebranché.
  Verrou Face ID / empreinte à l'ouverture et après 2 min en arrière-plan
  (choix du porteur ; aucun mot de passe stocké), activé dans le profil.
  Modules `expo-local-authentication`, `expo-document-picker`. Aucune table
  ni migration. **Prochaine étape : nouvelle compilation TestFlight et essai
  du porteur** (liste dans `docs/MODULES/mobile.md`), puis Sprint 17.
- **Sprint 15 — publication d'annonce mobile** (2026-11-11, branche
  `feature/publication-mobile`) — écran `PublierAnnonce` (Profil →
  « Publier une annonce », propriétaire et agence) : mêmes schéma, forfait,
  accord de dépassement et RPC `publier_annonce_keyli` que le web ; photos
  par caméra ou galerie (1 à 10, compression 2 000 px, envoi signé à
  Cloudinary), emplacement par carte ou position du téléphone. Règles des
  photos mises en commun (`src/partage/lib/photos.ts`, 8 tests) et
  réutilisées par le web. Modules `expo-image-picker`,
  `expo-image-manipulator`, `expo-location` ; autorisations iOS/Android en
  français. Aucune table ni migration. **Prochaine étape : essai par le
  porteur sur iPhone** (nouvelle compilation TestFlight), puis Sprint 16
  (vérification documentaire mobile : scan de pièce, biométrie).
- **Bienvenue : photos entières** (2026-11-11, branche
  `feature/bienvenue-photos-entieres`, retour du porteur sur iPhone :
  images trop zoomées) — photos dans l'espace entre logo et texte, en
  `contain`, photo 3 retéléchargée en 16:9 d'origine, zoom de 96 % vers
  100 % ; animation et fondus inchangés (validés par le porteur).
  Réglage final (même jour, « trop petit ») : photos en fond plein écran,
  zoom à 50 % entre photo entière et écran rempli, dégradé navy pour le
  texte. Vérifié dans l'aperçu web à 390×844.
  Envoyé sur TestFlight : compilation Codemagic n°4 (main f790982,
  2026-11-11), « UPLOAD SUCCEEDED ».
- **iOS : réglages Apple et Codemagic faits, première compilation**
  (2026-11-10) — identifiant `com.keyli.app`, profil « Keyli App Store »,
  app « Keyli » dans App Store Connect, application keyli-app dans
  Codemagic (dépôt autorisé côté GitHub), clé API « Keyli Codemagic »
  (`apple-app-store-connect`), variable `keyli_mobile`. 1re compilation :
  IPA compilé et signé en ≈ 11 min, envoi refusé (mauvais type de clé,
  erreur 401) ; clé remplacée. **2e compilation : réussie et envoyée à
  Apple** (Keyli 0.1.0, compilation 3, « UPLOAD SUCCEEDED », ≈ 6 min).
  **Prochaine étape : le porteur installe Keyli via TestFlight sur son
  iPhone** et fait la liste d'essai de `docs/MODULES/mobile.md` ; me
  transmettre les retours.
- **iOS : compilation Codemagic vers TestFlight** (2026-11-10, branche
  `feature/ios-codemagic`) — le porteur a un compte Apple Developer et un
  compte Codemagic : `codemagic.yaml` (flux `ios-testflight`, manuel)
  compile l'app sur Mac et l'envoie sur TestFlight. **Prochaine étape :
  le porteur fait les 7 réglages de `docs/MODULES/mobile.md` (section
  « iOS — TestFlight avec Codemagic ») et lance la première compilation** ;
  me transmettre le journal en cas d'échec.
- **iOS : préparation des essais sur iPhone** (2026-11-10, branche
  `feature/ios-preparation`, demande du porteur qui teste lui-même) — revue
  des différences iOS (déjà traitées), bord bas protégé pour la barre
  d'accueil, `app.json` complété (`buildNumber`,
  `usesNonExemptEncryption`), liste d'essai et chemin vers TestFlight dans
  `docs/MODULES/mobile.md`. **Prochaine étape : retours du porteur sur
  iPhone (Expo Go)**, puis corrections.
- **Écran de bienvenue : ajustements** (2026-11-10, branche
  `feature/bienvenue-ajustements`, demande du porteur) — mention
  « Abidjan · Côte d'Ivoire » retirée ; photos jugées trop zoomées :
  retéléchargées au format carré (les originaux sont carrés ou 16:9, le
  recadrage portrait en coupait un tiers), affichées dans un cadre carré sur
  toute la largeur, zoom animé réduit à 4 %.
- **Écran de bienvenue : photos réelles en défilement** (2026-11-09, branche
  `feature/bienvenue-photos`, demande du porteur) — l'illustration
  vectorielle est remplacée par trois photos Unsplash (villa tropicale,
  duplex, maison à toit-jardin) en fondu enchaîné avec zoom lent. Crédits et
  licence : `docs/MODULES/mobile.md`. Vérifié : types, assemblage Android,
  chargement des trois photos et console propre dans le navigateur ; à
  essayer sur le téléphone.
- **Écran de bienvenue mobile, fait** (2026-11-09, branche
  `feature/sprint14-accueil-mobile`, demande du porteur) — l'application
  s'ouvre, pour un visiteur non connecté, sur une illustration futuriste
  animée aux couleurs de Keyli avec « Créer un compte », « Se connecter » et
  « Découvrir les annonces sans compte » (consultation libre conservée).
  Vérifié dans le navigateur (rendu, trois boutons, aucune erreur) et
  assemblage Android ; à essayer sur le téléphone. Détail :
  `docs/MODULES/mobile.md`. **Vérification de la mise en ligne du
  2026-11-09** : le site sert encore l'ancien tableau de bord
  (`source=recommendation`) — le correctif des recommandations n'est pas en
  ligne, `npm run deploy` à relancer depuis `main` à jour.
- **Sprint 14 — catalogue mobile, terminé** (2026-11-09, branche
  `feature/sprint14-catalogue-mobile`) — périmètre choisi par le porteur :
  filtres complets, carte native, favoris et alertes, fiche enrichie.
  Recherche : panneau de filtres identique au web (transaction, séjour court
  avec calendrier et voyageurs, type, commune, quartier, prix, pièces,
  meublé, équipements), tri, nombre de résultats, pages, bouton « Créer une
  alerte ». Vue carte `react-native-maps` aux positions approximatives
  (comptée `map` dans les statistiques). Fiche : galerie plein écran, badge
  officiel (`react-native-svg`, dessin de `public/keyli_verified_badge.svg`),
  favori, partage par la feuille du téléphone, annonces similaires. Écrans
  « Mes favoris » et « Mes alertes » depuis le profil. Règles déplacées
  dans `src/partage` avec tests (40) : grille et choix du calendrier
  (`sejour.ts`, le calendrier web les utilise), `filtresDepuisAlerte` et
  `etatBoutonAlerte` (`recherche.ts`, le bouton web les utilise). **Bug
  corrigé côté site** : les recommandations du tableau de bord envoyaient
  `source=recommendation` (refusé par la base) et étaient comptées en
  « lien direct ». Vérifié : types, assemblage Android, filtres et
  calendrier dans le navigateur (la base en ligne n'a encore aucune annonce
  publiée : cartes, fiche et carte native restent à essayer sur le
  téléphone avec des annonces). **À faire par le porteur** : essai sur
  téléphone ; pour une version installable (hors Expo Go), une clé Google
  Maps Android sera nécessaire (voir `docs/MODULES/mobile.md`). Aucune
  migration ; site : seulement le correctif des recommandations
  (`npm run deploy` quand le porteur le souhaite).
- **Sprint 13 — socle du projet mobile, terminé** (2026-11-08, branche
  `feature/sprint13-socle-mobile`) — périmètre choisi par le porteur : projet
  Expo et logique partagée, navigation de base, connexion et inscription,
  charte visuelle mobile. Identifiant d'application `com.keyli.app` (décision
  du porteur, irréversible une fois publié) ; essais sur le téléphone du
  porteur avec Expo Go. `apps/mobile/` réutilise `src/partage` sans rien
  recopier (Metro + alias) ; session dans le coffre de l'appareil ; onglets
  Accueil, Recherche, Messages, Profil, fiche annonce, parcours de compte,
  acceptation des CGU. `urlPhoto` et les libellés de rôle déplacés dans
  `src/partage`. Job CI « Application mobile » (types + assemblage Android).
  Vérifié : types, assemblage, écrans dans le navigateur (base en ligne en
  lecture). **Validé par le porteur sur téléphone le 2026-11-09** : connexion
  réelle et session retrouvée après fermeture (Expo Go, port 8082). **Bloquants rencontrés** : disque C
  plein (libéré par le porteur), Node 20 trop ancien pour React Native 0.88
  (Node 22 LTS à installer par le porteur), création automatique du projet
  Expo refusée par le contrôle de sécurité (fichiers écrits à la main),
  Docker arrêté (base locale indisponible). Détail : `docs/MODULES/mobile.md`.
  Rien à mettre en ligne (aucune migration, site inchangé à l'écran).
  **Sprint 11-12 en ligne le 2026-11-08** (3 migrations, 2 fonctions, CSP
  vérifiées).
- **Sprint 11-12 — stabilisation pré-mobile, terminé** (2026-11-08, branche
  `feature/sprint11-stabilisation`) — périmètre choisi par le porteur :
  sécurité de la base, sécurité des fonctions et du site, email du profil
  synchronisé, dette technique. Migrations `20261117120000_securite_droits_keyli`
  (droits exacts sur 3 tables, plus aucun droit par défaut pour les objets
  futurs), `20261117130000_email_profil_synchronise_keyli` (l'email du
  profil suit le changement d'adresse dans Auth) et
  `20261117140000_disponibilite_recherche_keyli` (**bug corrigé** : la
  recherche par dates affichait comme libre un logement réservé par
  quelqu'un d'autre). Audit permanent `audit_securite_keyli.test.sql`
  (13 contrôles, bloquant en CI). **Bug corrigé côté site** : la CSP
  bloquait l'envoi des photos vers Cloudinary depuis le Sprint 6. Erreurs
  internes masquées dans `handle-paystack-payment` et `envoyer-emails`.
  800 tests en local. Détail : `docs/MODULES/stabilisation-pre-mobile.md`.
  Mise en ligne : `npx supabase db push --linked` (porteur), déploiement
  des 2 fonctions, puis `npm run deploy` (porteur).
  **Sprint 10 en ligne le 2026-11-08** (site vérifié).
- **Sprint 10 — extraction de la logique partageable, terminé**
  (2026-11-08, branche `feature/sprint10-logique-partageable`) — périmètre
  choisi par le porteur : cartographie (`docs/LOGIQUE_PARTAGEE.md`), dossier
  `src/partage/` (24 hooks de données et 13 fichiers de règles déplacés avec
  leur historique, sans changement visible), garde-fou de lint bloquant en
  CI (aucun accès au navigateur ni import du code web dans `src/partage`),
  tests unitaires Vitest (`npm test`, 31 tests, en CI). Deux points d'entrée
  fournis par chaque application : `@/integrations/supabase/client` (fabrique
  partagée `creerClientKeyli`) et `@/plateforme` (stockage, adresse du site,
  identifiants). Adaptations : lien de document admin, configuration Google
  Maps (web), identifiant de session et identifiants de fichiers via
  `@/plateforme`. Aucune migration, rien à mettre en ligne côté base.
  Points à vérifier au démarrage du mobile : `URLSearchParams` (polyfill) et
  formats `Intl` sous Hermes. **Sprint 9 en ligne le 2026-11-08** (base,
  4 fonctions et site vérifiés).
- **Sprint 9 — fiabilisation des paiements, terminé** (2026-11-08, branche
  `feature/sprint9-paiements`) — périmètre choisi par le porteur :
  rattrapage automatique des paiements en attente (Edge Function
  `rapprocher-paiements`, toutes les 15 min), paiements refusés (motif,
  notification et email `paiement_echoue`, bandeau « Réessayer »), onglet
  admin « Paiements » (synthèse, contrôles, liste, vérification immédiate)
  et surveillance horaire des échéances (oubli corrigé aussitôt, anomalies
  dans le journal des erreurs). Migration
  `20261116120000_fiabilisation_paiements_keyli.sql` (25 tests, 781 au
  total en local). Détail : `docs/MODULES/paiements.md`. Constat : une
  échéance oubliée ne laissait déjà aucune annonce visible ; le risque
  portait sur les paiements jamais confirmés et les rappels.
  Mise en ligne dans l'ordre : `npx supabase db push --linked` (porteur),
  déploiement des 4 fonctions, puis `npm run deploy` (porteur).
  **Sprint 8 en ligne le 2026-11-08** (migration et site vérifiés).
  Note locale : compte de test local `paiements.demo@keyli.test` (admin,
  sans mot de passe). Les annonces de démonstration du Sprint 8, qui
  faussaient 5 fichiers de tests, ont été supprimées le 2026-11-08.
- **Sprint 8 — optimisation de la conversion, terminé** (2026-11-08,
  branche `feature/sprint8-conversion`) — périmètre choisi par le porteur :
  mesure de la conversion (onglet admin « Conversion » : taux vue → contact
  d'une période de référence, le pilote, et d'une période étudiée, écart à
  l'objectif de +20 %, par commune et type), fiche plus efficace (bandeau
  de contact mobile, intentions de contact enregistrées, annonces
  similaires), qualité des annonces (score et conseils, repère d'affichage)
  et statistiques annonceur (bloc « Performance de mes annonces »).
  Migration `20261115120000_conversion_annonces_keyli.sql` (fonctions
  seulement, 13 tests, 756 au total en local). Détail :
  `docs/MODULES/conversion.md`. Constat : avant ce sprint, aucun clic
  « Contacter » n'était enregistré (seules les vues). Le volet « appel et
  WhatsApp » proposé a été écarté : le téléphone de l'annonceur reste privé.
  Mise en ligne par le porteur : `npx supabase db push --linked` puis
  `npm run deploy`.
  **Sprint 7 en ligne le 2026-11-08** : migration du support appliquée,
  formulaire et droits vérifiés sur le distant, correction de la taille de
  la vidéo déployée.
- **Sprint 7 — ouverture grand public, terminé** (2026-11-07, branche
  `feature/sprint7-ouverture`) — périmètre choisi par le porteur : passage
  grand public (`/pilote` devient `/partenaires`, pour propriétaires et
  agences, ancienne adresse redirigée ; textes de l'accueil, du pied de
  page et d'À propos), référencement (titre et description par page ;
  fonctions Cloudflare `sitemap.xml`, `robots.txt` et aperçu propre à
  chaque annonce partagée — titre, prix, lieu, photo), aide et support
  (formulaire « Nous contacter » ouvert à tous sur la page Aide, onglet
  admin « Support », FAQ enrichie ; table `demandes_support_keyli`,
  migration `20261114120000_support_visiteurs_keyli.sql`, 14 tests, 743 au
  total en local), services en mode réel (guide `docs/MISE_EN_PRODUCTION.md`).
  Détail : `docs/MODULES/ouverture-grand-public.md`. Fonctions testées en
  local avec wrangler (aperçu vérifié sur une annonce simulée : la base
  distante ne renvoie aucune annonce à un visiteur au 2026-11-07). Pas de
  bouton WhatsApp : aucun numéro d'assistance fourni.
  Mise en ligne par le porteur : `npx supabase db push --linked` puis
  `npm run deploy` (le script écrit désormais la configuration publique des
  fonctions avant l'envoi).
- **Animations cinématiques** (2026-11-07, branche
  `feature/animations-cinematiques`) — demande du porteur : site
  « très impressionnant », aligné sur le style innovant. Choix : registre
  cinématique complet sur tout le site (accueil, transitions de page, pages
  publiques, tableaux de bord), bibliothèque Motion 14.6.0 (+44 Ko
  compressés). Remplace le registre discret du 2026-11-02. Détail :
  `docs/ANIMATIONS.md` (section « Registre cinématique »). Testé dans le
  navigateur : accueil (bannière, défilement, vidéo), rideau vers À propos ;
  tableaux de bord vérifiés par compilation seulement (pas de compte local).
- **Sprint 6 — stabilisation du pilote, terminé** (2026-11-07, branche
  `feature/sprint6-stabilisation`) — périmètre choisi par le porteur :
  relances automatiques des annonceurs bloqués (pièces non envoyées,
  pièce refusée, compte vérifié sans annonce ; à 3 puis 7 jours, cloche et
  email `relance_demarrage`), délais de vérification (âge des dossiers dans
  la file, en rouge au-delà de 48 h ; dossiers en retard, délai moyen et
  relances dans l'onglet Pilote), journal des erreurs (`/admin/erreurs`,
  données nettoyées, 90 jours), Content-Security-Policy dans
  `public/_headers` (testée sur le build, aucune violation). 15 tests
  pgTAP verts en local. Détail : `docs/MODULES/stabilisation.md`.
  **En ligne le 2026-11-07** (migrations 20261112 et 20261113 appliquées
  sur le distant, `envoyer-emails` redéployée, site déployé avec la vidéo et
  les animations) : en-têtes et CSP actifs, aucune violation sur l'accueil,
  la recherche, À propos, Pilote, connexion, inscription et CGU ; vidéo lue.
  Tests pgTAP sur le distant non relancés (action refusée par le contrôle
  de sécurité de Claude Code) : à lancer par le porteur
  (`npx supabase test db --linked`).
  Vidéo de l'accueil intégrée (section « Keyli en 45 secondes »,
  `public/videos/`).
- **Vidéos Keyli** (2026-11-06, branche `feature/videos-keyli`) — demande
  du porteur : deux publicités de 30 s (voix off femme et homme, voix
  Windows), en 16:9 et 9:16, et une vidéo de 45 s sur l'accueil (atouts :
  recherche, carte et GPS, vérification, contact). Motion design Remotion
  dans `video/`, musique générée par calcul. Détail :
  `docs/MODULES/videos.md`. Reste : adresse du site sur l'écran final
  quand keyli.com sera branché.
- **Sprint 5 — lancement et suivi terrain, terminé** (2026-11-06, branche
  `feature/sprint5-lancement-pilote`) — périmètre choisi par le porteur :
  candidature au pilote (page publique `/pilote`, fonction
  `candidater_pilote_keyli`, plus d'insertion directe pour ne pas révéler
  les emails connus), onglet « Pilote » du back-office (entonnoir de
  démarrage des annonceurs, candidatures, retours, visites, séjours ; file
  des candidatures avec priorité, note et « compte créé »), bouton
  Partager sur la fiche annonce (WhatsApp, lien copié, source
  `lien_direct`) et aperçu des liens (Open Graph, générique), pages
  chargées à la demande (fichier principal 792 Ko → 310 Ko). Migration
  `20261112120000_lancement_pilote_keyli.sql` (15 tests, 714 au total).
  Détail : `docs/MODULES/lancement-pilote.md`. Reste ouvert : tarif du
  pilote, relances automatiques, aperçu de lien propre à chaque annonce
  (rendu serveur). Docker local instable faute de mémoire (2026-11-06).
  Mise en ligne : `npx supabase db push --linked` puis `npm run deploy`
  (porteur).
- **Sprint 4 — accueil du panel pilote, terminé** (2026-11-06, branche
  `feature/sprint4-demarrage-retours`) — périmètre choisi par le porteur :
  parcours de démarrage des annonceurs (étapes calculées par la base, en
  tête des tableaux de bord propriétaire et agence) et retours des
  utilisateurs (« Donner mon avis », onglet « Retours » du back-office,
  réponse notifiée par cloche et email). Migration
  `20261111120000_demarrage_retours_keyli.sql` (16 tests, 699 au total) ;
  fonction `envoyer-emails` redéployée (lien « Lire la réponse »).
  **À décider avant l'ouverture** : tarif des annonceurs pendant le pilote
  (offert ou payant → Paystack réel). Non retenus pour l'instant : page de
  candidature au pilote, relances automatiques. Le reste du sprint est du
  terrain (recrutement des 500 biens). Mise en ligne :
  `npx supabase db push --linked` puis `npm run deploy` (porteur).
- **Accueil, catalogue et page À propos** (2026-11-04, branche
  `feature/accueil-catalogue-a-propos`) — décisions du porteur : l'accueil
  garde la recherche, le catalogue des biens (liste ou carte) et les
  communes ; la présentation passe dans `/a-propos` (qui sommes-nous,
  garanties, parcours, annonceurs, vision, contact). Carte : positions
  approximatives (≈ 450 m). **Faille corrigée au passage** : la position
  GPS exacte des annonces était lisible par l'API ; elle ne l'est plus.
  Migration `20261110120000_carte_annonces_keyli.sql` (9 tests, 683 au
  total). Vue carte ajoutée aussi à Recherche. Mise en ligne :
  `npx supabase db push --linked` **puis** `npm run deploy` (porteur).
- **Pages légales et acceptation des CGU** (2026-11-04, branche
  `feature/pages-legales`) — décisions du porteur : textes dans le code,
  versionnés ; acceptation à la prochaine connexion. Pages `/conditions`,
  `/confidentialite` (loi n° 2013-450, ARTCI), `/mentions-legales`,
  `/aide`, liens dans le pied de page ; case obligatoire à l'inscription ;
  écran d'acceptation pour les comptes connectés (`PorteCgu`). Migration
  `20261109120000_acceptation_cgu_keyli.sql` (9 tests, 674 au total).
  **Avant l'ouverture au public** : relecture par un juriste, déclaration
  ARTCI, remplir les mentions « À COMPLÉTER » (forme juridique, RCCM,
  adresse, récépissé ARTCI), activer contact@keyli.com. Mise en ligne :
  `npx supabase db push --linked` **puis** `npm run deploy` (porteur).
  Détail : `docs/MODULES/juridique.md`.
- **Emails de notification** (2026-11-02, branche
  `feature/emails-francais`) — architecture validée par le porteur : file
  d'envoi + tâche planifiée + Edge Function `envoyer-emails` (Resend).
  Réservations, visites, compte/vérification, abonnement, alertes,
  nouveaux messages (regroupés). Interrupteur dans Profil, page
  `/desinscription`. 27 tests (665 au total), chaîne complète vérifiée en
  local (Mailpit). En ligne le 2026-11-04 (migration, fonction, coffre, site
  déployé) ; reste `RESEND_API_KEY` quand keyli.com est vérifié. Checklist
  `docs/MODULES/emails.md` (db push, deploy de la fonction, 2 valeurs dans
  Vault, puis `RESEND_API_KEY` quand keyli.com est vérifié).
- **Animations et transitions du site** (2026-11-02, branche
  `feature/animations-transitions`) — registre « élégant et discret »
  choisi par le porteur : transition et retour en haut à chaque page,
  apparition des sections de l'accueil au défilement (amendement de la
  règle 4 de `docs/ANIMATIONS.md`), photos en fondu, fondu enchaîné de la
  galerie, zoom des cartes au survol, cascade des résultats, battement du
  cœur favori, menu mobile animé, en-tête collant. Tout est neutralisé en
  mouvements réduits. Détail : `docs/ANIMATIONS.md`.
- **Séjours courts et demandes de réservation** (déployés le 2026-11-02 :
  migration poussée, 33 fichiers de tests verts sur le distant, site mis
  en ligne par le porteur) (2026-11-01, branche
  `feature/reservations-sejours`) — amendement du PRD décidé par le
  porteur : dates d'arrivée/départ façon Booking, hôtels et auberges par
  types de chambres, demande acceptée/refusée par l'hôte, sans paiement en
  ligne. Migration `20261106120000_reservations_sejours_keyli.sql`
  (35 tests pgTAP, 638 au total), page `/reservations`, calendrier,
  recherche par dates, gestion des chambres. Détail :
  `docs/MODULES/reservations.md`. Test réel à faire par le porteur
  (publier un hôtel, ajouter des chambres, réserver). Suites possibles : paiement
  en ligne, blocage manuel de dates, tarifs saisonniers.
- **Page d'accueil refondue** (2026-11-01, branche
  `feature/accueil-reference`) — bannière avec recherche intégrée,
  annonces vérifiées réelles, parcours en 4 étapes, communes, espace
  annonceurs, vision sous-régionale. Détail : DESIGN_SYSTEM.md, section
  « Page d'accueil ». À mettre en ligne avec `npm run deploy` (porteur).
- **Photos des annonces — mise en service** — code fait le 2026-11-01
  (migration `20261105120000_photos_annonces_keyli.sql`, Edge Function
  `cloudinary-signature`, 1 à 10 photos, gestion dans « Mes annonces »,
  20 tests pgTAP). Compte Cloudinary `djizi4dod` créé et reporté dans
  `cloudinary_cloud_keyli()`. Fait le 2026-11-01 : 3 secrets Cloudinary
  posés par le porteur, migration poussée sur le distant (603 tests verts
  sur le distant), Edge Function `cloudinary-signature` déployée. Reste :
  `npm run deploy` par le porteur (le site en ligne appelle encore
  l'ancienne `publier_annonce_keyli` : publication en panne d'ici là),
  puis test réel. Détail :
  `docs/MODULES/photos.md`.
- **Google Maps — domaine de production** — clé posée et carte vérifiée le
  2026-11-01 (secret `GOOGLE_MAPS_API_KEY` + `.env` local). Le jour du
  déploiement : ajouter le domaine d'hébergement aux référents de la clé
  « Keyli – web » (Google Cloud, projet Nguessan-IT).

- **Emails** — Resend choisi (2026-11-01). Modèles français prêts
  (`supabase/templates/`). Bloqué par le domaine : **keyli.com** (décision
  du porteur du 2026-11-04, à la place de keyli.ci ; domaine apparemment
  parqué chez namefind.com, achat à confirmer), puis DNS sur Cloudflare.
  Contact prévu : contact@keyli.com (pas encore actif). Checklist : `docs/MODULES/emails.md`.

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
   et facturation des dépassements faites : module pricing complet en
   mode test. Écran de publication fait (2026-10-27). Recherche et fiche
   d'annonce faites (2026-10-28). Messagerie faite (2026-10-29). Favoris
   faits (2026-10-30). Visites et avis faits (2026-10-30) : Sprint 2
   terminé. Cloche de notifications faite (2026-10-31). Suite : Sprint 3
   (back-office admin : file de vérification, modération, analytics de
   base) ; photos dès les clés Cloudinary ; emails (fournisseur à choisir).
6. **Sprints 3bis — dashboards enrichis (semaines 11-19), en cours.**
   Préalables faits le 2026-11-02 : logo officiel et déclinaisons
   (`generer-raster.cjs`), charte alignée sur le logo (`--primary-glow` bleu
   du logo, `--turquoise` accent public, `--gold` réservé aux étoiles).
   Semaine 11 faite : classes d'animation des dashboards dans
   `dashboard-animations.css`, `useCountUp.ts`, `KpiCard` animée (cascade +
   compteur) utilisée par `/admin`. Semaine 12 faite : `Sparkline` (SVG,
   tracé animé), `DonutChart` (conic-gradient + légende), `TrendBar` (barre
   animée, accessible) dans `src/components/dashboard/`, éprouvées sur
   `/admin` (objectifs du pilote, comptes par profil, activité 30 j) ; RPC
   `admin_activite_quotidienne_keyli` (migration
   `20261102120000_activite_quotidienne_keyli.sql`, 5 tests, 548 au total).
   Semaine 13 faite : `DashboardSidebar` (variantes sombre / claire,
   indicateur actif qui glisse, badges, barre horizontale défilante sous
   1024 px), `DashboardTopbar` (recherche facultative, cloche, avatar et menu
   profil), `DashboardShell` (cadre commun), `KpiCard` complète (badge ▲/▼,
   mini-graphique sous la valeur) ; vitrine `/dev/composants` (développement
   uniquement, absente du build). Semaine 14 faite : `VerificationStepper`
   (cercles qui se remplissent puis traits dessinés l'un après l'autre,
   tient en 375 px), `InsightCard` (bordure orange / violette / verte selon
   le type, glissement), `AgendaList` (pastilles de date, visite annulée
   barrée), `MessagePreviewList` (initiales, badge « Nouveau ») — testés
   dans la vitrine ; `initiales()` partagée dans `lib/format.ts`.
   Semaine 15 faite (2026-10-30) : `LeadCard` (étape changée par un menu,
   soulèvement au survol), `LeadPipeline` (4 colonnes avec compteurs,
   défilement horizontal sous 1024 px), `RecommendationCard` +
   `CarrouselRecommandations` (scroll-snap, chip Vérifié, score « % pour
   vous » affiché seulement s'il est fourni), `CompareTable` (une colonne par
   bien, colonne des critères fixe, retrait d'un bien) ; constantes dans
   `lib/dashboard.ts` ; testés dans la vitrine (bureau et 375 px).
   Décision : ni Framer Motion ni `@dnd-kit` (pipeline par menu).
   Semaine 16 faite (2026-10-30) : `/tableau-de-bord` selon le rôle
   (`TableauDeBord.tsx`) — `OwnerDashboard` (3 KPI réels avec variation et
   série des vues, bandeau « Repère de prix » = écart au prix moyen fiable
   du quartier, pas un modèle IA, stepper de vérification déduit des
   documents, messages, biens face au quartier, visites) et
   `UserDashboard` (carrousel « Pour vous », comparateur de 3 favoris,
   quartiers les plus recherchés, alertes et nouveautés, messages, visites).
   Score de pertinence validé par le porteur (quartier 40, type 25, prix 20,
   vérifiée 15). Migration `20261103120000_tableaux_de_bord_keyli.sql`
   (18 tests, 566 au total). Après connexion, arrivée sur le tableau de
   bord ; lien « Tableau de bord » dans l'en-tête. L'agence utilise
   provisoirement le dashboard propriétaire. Écran de création des alertes
   de recherche : fait le 2026-10-31 (voir après la semaine 19).
   Semaine 17 faite (2026-10-31) : `AgencyDashboard` — barre latérale
   sombre, sélecteur 7/30/90 j (fond qui glisse, `PeriodeSelecteur`), 4 KPI
   (annonces, vues, leads actifs, note), pipeline réel (étape et agent
   changés par menu), répartition des annonces, 3 conseils à règles fixes
   validées par le porteur, tableau `PerformanceEquipe` (conversion animée,
   ajout et désactivation d'agents), visites à venir. Migration
   `20261104120000_dashboard_agence_keyli.sql` (17 tests, 583 au total).
   Correctif : les libellés masqués (`sr-only`) dans les zones à défilement
   horizontal faisaient déborder la page — conteneurs en `relative`.
   Attribution d'un agent depuis « Mes annonces » : faite le 2026-10-31.
   Semaine 18 faite (2026-10-31) : la souscription et le changement de
   forfait pour les 3 paliers existaient depuis le Sprint 1 (`Abonnement.tsx`,
   `useAbonnement.ts`, paiement Paystack testé) ; ajoutés : consommation du
   mois, règle de dépassement par forfait, confirmation du changement de
   forfait (jours perdus, montant), recommandation de forfait, historique des
   paiements. Aucune migration.
   Semaine 19 faite (2026-10-31) — QA transverse, Sprint 3bis terminé :
   * Navigation (décision du porteur « tout dans le cadre ») : tableau de
     bord, Mes annonces, Publier, Messages, Favoris, Abonnement (+ retour de
     paiement) et Profil s'affichent dans le cadre du tableau de bord
     (`CadreConnecte`, layout route protégée dans `App.tsx`), barre latérale
     selon le rôle centralisée dans `lib/navigation.ts` (les 3 dashboards ne
     déclarent plus leur cadre). Accueil, Recherche, fiche d'annonce,
     authentification et `/admin` gardent l'en-tête public. Un admin qui
     ouvre Profil ou Messages voit une barre « Back-office ».
   * Accessibilité : audit axe-core (installé temporairement, hors
     `package.json`) sur tous les écrans avec les 4 comptes de démo →
     0 violation WCAG A/AA. Corrigé : teintes de texte foncées
     `--success-texte`, `--pending-texte`, `--destructive-texte` (voir
     DESIGN_SYSTEM.md), `--muted-foreground` légèrement foncé, titre `h1`
     manquant (Abonnement et Publier côté chercheur), lien « Aller au
     contenu » dans les deux cadres, flèche du menu profil sans transition
     en mouvements réduits.
   * Responsive : aucun débordement horizontal à 360 px sur tous les écrans
     (4 rôles) ; hauteur de Messages ajustée au cadre (mobile et bureau).
   * Données de démonstration : aucune dans le build de production
     (`/dev/composants` exclu, aucun compte ni identifiant de démo dans
     `dist/`). Les données de démo restent uniquement dans les scripts SQL
     locaux du développeur, jamais dans les migrations.
   Aucune migration (583 tests inchangés).
   Faits ensuite le même jour (branche `feature/alertes-agents`, aucune
   migration — la base gérait déjà tout) :
   * Alertes de recherche : bouton « Créer une alerte » sur Recherche (filtres
     en cours ; visiteur → connexion puis retour), doublon détecté (« Alerte
     active » / « Réactiver »), équipements signalés comme non pris en
     compte ; dashboard chercheur : « Voir », « Mettre en pause »,
     « Réactiver ». Détail : `MODULES/annonces.md`.
   * Agence : menu « Agent responsable » sur chaque annonce non archivée de
     « Mes annonces » (agents actifs + agent désactivé encore attribué) ;
     sans agent, lien vers le bloc Équipe du dashboard (`#equipe`). La RLS
     vérifie que l'agent appartient à l'agence. Liste « Mes annonces » triée
     de façon stable (départage par id).
   Prochaine étape du calendrier : Sprint 4 (sem. 20-21) — onboarding du
   panel pilote (500 propriétés). C'est surtout du terrain ; côté code, il
   dépend des éléments attendus du porteur : clés Cloudinary (photos),
   fournisseur d'email, Paystack en mode live (voir « Blocages »). Fait le 2026-10-31 : fiacrenguessan@outlook.com
   promu super_admin sur le distant (procédure `SETUP.md`) ; carte Mapbox
   remplacée par Google Maps ; clé posée et carte vérifiée le 2026-11-01,
   ancienne Edge Function `get-mapbox-token` supprimée du distant ; carte
   aux couleurs Keyli (style cloud + repère maison, 2026-11-01).
   **Fin de projet (après les apps mobiles natives, Phase 3)** : produire la
   vidéo publicitaire à effets innovants demandée par le porteur le
   2026-10-30.
5. **Sprint 3 (semaines 9-10) — back-office admin : fait le 2026-11-01.**
   Premier super_admin promu le 2026-10-31 ; suite recommandée : le porteur
   teste l'envoi et l'ouverture de documents
   sur le projet distant (le stockage n'est pas lancé dans la pile locale).
   Ensuite : dashboards enrichis (Sprints 3bis, Sem. 11-19) ; photos dès les
   clés Cloudinary ; emails (fournisseur à choisir) ; écran de gestion des
   rôles (nommer des admins) ; délai de relance des documents en attente.
7. **Après le Sprint 7 (2026-11-07)** : le porteur applique la migration et
   déploie, puis suit `docs/MISE_EN_PRODUCTION.md` (keyli.com, Resend,
   adresses Supabase Auth, emails Auth en français, Paystack live, Search
   Console). Points ouverts : tarif, numéro d'assistance WhatsApp, adresse
   keyli.com sur l'écran final des vidéos, 10 fichiers de tests distants à
   relancer (`npx supabase test db --linked`). Ensuite : application mobile
   (React Native, `docs/MODULES/mobile.md`).
8. **Après le Sprint 8 (2026-11-08)** : migration et déploiement par le
   porteur ; relever le taux de conversion dans 2 à 4 semaines. Suite du
   calendrier : Sprint 9 — fiabilisation des paiements (relances
   d'expiration, échecs, réconciliation), puis Sprint 10 — extraction de la
   logique partageable (préalable au mobile).
9. **Après le Sprint 9 (2026-11-08)** : mise en ligne dans l'ordre (base,
   fonctions, site), puis paiement de test refusé et réussi en mode test
   Paystack, et suivi de l'onglet Paiements pendant 2 semaines. Suite du
   calendrier : Sprint 10 — extraction de la logique partageable.
10. **Après le Sprint 10 (2026-11-08)** : `npm run deploy` (aucun changement
    visible attendu). Suite du calendrier : Sprint 11-12 — stabilisation
    pré-mobile (revue de sécurité, dette technique), puis Phase 3 mobile
    (IDs d'applications à confirmer par le porteur avant tout code).

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
- 2026-10-26 : facturation des dépassements (mensuelle, avec le paiement
  suivant, montant négocié si > 30, recommandation in-app à 2 mois) ;
  correctif du comptage du seuil par cycle mensuel.
- 2026-10-27 : écran de publication d'annonce (avantages en liste fermée,
  photos reportées, point GPS Mapbox + ma position).
- 2026-11-09 (Sprint 14) : catalogue mobile (filtres, carte, favoris,
  alertes, fiche enrichie). Création de fichiers longs par le shell
  instable (accents graves) : fichiers écrits par l'outil d'écriture.
  Sélecteur de dates natif abandonné au profit d'un calendrier React Native
  (fonctionne aussi dans l'aperçu navigateur).
- 2026-11-02 : logo officiel du porteur (sources dans
  `docs/keyli_brand_assets/sources/`, déclinaisons générées) ; charte : navy
  conservé, bleu du logo en accent, turquoise à la place de l'or sur
  l'Accueil, badge Vérifié inchangé ; semaine 11 des dashboards.
- 2026-11-01 (Sprint 3) : écrans utilisateur d'envoi des documents et de
  signalement inclus (oubli du Sprint 1) ; motifs de signalement en liste ;
  premier super_admin promu à la main ; inscriptions 30 j hors comptes admin.
- 2026-10-29 : messagerie (conversations, temps réel Supabase + filet de
  60 s). Machine : disque C: et RAM saturés ont bloqué Docker (porteur a
  libéré de la place et redémarré).
- 2026-10-28 : recherche et fiche d'annonce (tri vérifiées d'abord, filtres
  sans carte pour l'instant, contact par messagerie Keyli seule).
- 2026-10-31 (Sprint 3bis, semaine 18) : page Abonnement complétée
  (consommation, confirmation de changement, historique des paiements).
- 2026-10-31 (Sprint 3bis, semaine 17) : dashboard Agence sur données
  réelles ; règles des conseils et sélecteur de période validés.
- 2026-10-30 (Sprint 3bis, semaine 16) : tableaux de bord Propriétaire et
  Chercheur sur données réelles ; score de pertinence validé par le porteur.
- 2026-10-30 (Sprint 3bis, semaine 15) : composites du pipeline de leads,
  des recommandations et du comparateur ; pipeline par menu, sans Framer
  Motion ni `@dnd-kit` ; vidéo publicitaire prévue en fin de projet.
- 2026-10-26 (validé par le porteur) : dépendances mises à jour —
  react-router-dom 7.18.4, zod 4.6.7, @hookform/resolvers 5 ; plus aucune
  faille sur les dépendances de production (STACK.md à jour) ; puis Vite
  5.4 → 8.3 et @vitejs/plugin-react 6 (installé avec npm 11, npm 10.8
  échouant sur l'arbre de dépendances).

---

### Session du 2026-11-13/14 — captures Google Play et retours bêta mobile
- **Captures Google Play** : 7 captures 1080 × 1920 dans
  `apps/mobile/fiche-store/captures/` (bienvenue, accueil, fiche vérifiée,
  recherche, petits budgets, filtres, fiche studio), faites sur l'aperçu
  navigateur de l'app (Chrome sans fenêtre à 360 × 640, densité 3).
  L'émulateur Android ne tourne pas sur ce PC (8 Go de RAM, disque C:
  saturé — caches npm, Gradle et temporaires vidés, ~7 Go libérés).
  Expo SDK 58 exige Node 22.13+ : configuration `keyli-mobile-web-node26`
  ajoutée à `.claude/launch.json` (Node 26 de `C:\Program Files\nodejs`,
  nvm n'a que Node 20).
- **⚠️ Annonces FICTIVES en ligne** (demande du porteur, pour les captures) :
  8 annonces du compte propriétaire « Test »
  (`eff2f7a4-abdf-4ee1-88d4-bd8f76dfb87f`) dans la base distante, photos
  Pexels, insérées en `session_replication_role = replica` (aucun
  déclencheur : ni alerte, ni facturation, ni email). Le porteur a demandé
  de les GARDER pour l'instant (essais d'affichage). **À supprimer ensuite**
  (`delete from properties_keyli where owner_id = 'eff2f7a4-…'`, médias en
  cascade ; vérifier aussi messages, interactions et favoris liés — le
  porteur a écrit à l'une d'elles le 13/11).
- **Retours du porteur sur la bêta** (branche
  `feature/mobile-entete-carte-photos-contact`) :
  1. Accueil : en-tête fixe logo + bouton « Rechercher un logement » ;
  2. Carte : aperçu photo des logements en vue rapprochée (`ZOOM_APERCU`) ;
  3. Correction automatique des photos à l'affichage
     (`CORRECTION_PHOTO` = `e_improve/e_sharpen:80` dans `urlPhoto`, web et
     mobile ; tests mis à jour) ;
  4. Messagerie entièrement dans l'app : contact sur la fiche, onglet
     Messages, écran Conversation, pastille non lus — plus de renvoi au site.
  Détail : `docs/MODULES/mobile.md`, `photos.md`, `messagerie.md`.
  5. **Recherche « Autour de moi »** (promesse produit) : décisions du
     porteur — rayons 1/3/5/10 km, 5 par défaut ; le rayon remplace commune
     et quartier ; distance arrondie « à environ X km » calculée sur la
     position approximative ; web ET mobile. Migration
     `20261119120000_recherche_rayon_keyli.sql` + tests pgTAP (essayés sur
     la base distante dans des transactions annulées : 9/9). **En ligne le
     2026-11-14** (mise en ligne par le porteur), types régénérés depuis la
     base distante (`gen types --linked`, d'où une mise en forme différente
     du fichier). Essai réel : depuis le Plateau à 5 km, l'appartement de
     Marcory « à environ 4,5 km ». Détail : `docs/MODULES/geolocalisation.md`.
  6. **Barre d'onglets Keyli en relief** (essai) : `BarreOnglets.tsx`,
     retour possible par `STYLE_BARRE = 'classique'`.
  7. **Site web, pages de connexion et d'inscription** : panneau de photos à gauche sur grand
     écran (`PanneauPhotos.tsx`), les trois photos de l'écran de bienvenue
     mobile, en fondu enchaîné avec un zoom lent (`kf-defile`, mouvements
     réduits respectés) ; masqué sur petit écran (le formulaire d'abord). Sur
     l'inscription (formulaire long), le panneau reste fixe au défilement.
  8. **Brouillon du dossier de publicité et du pilote multi-villes**
     (`docs/MODULES/publicite-pilote-villes.md`) : villes proposées par
     vagues (Abidjan ; Bouaké, San-Pédro, Yamoussoukro ; Korhogo, Daloa ;
     séjours à Grand-Bassam/Assinie), messages, canaux, calendrier,
     travaux techniques (villes dans la base, suivi des campagnes).
     **Décisions du porteur prises le jour même** (vague 2 ouverte,
     200 000 XOF de décembre à mars, équipe et visites dans les villes,
     seuil de 50 annonces vérifiées par ville, pixels Meta/TikTok avec
     consentement, gratuité nationale pendant les 3 mois du pilote) :
     `PRD_REGLES.md` (« PILOTE NATIONAL ») et le dossier, section 7.
  9. **Branche `feature/pilote-national`** (en cours) : « Abidjan » retiré
     des textes en dur (accueil, recherche, partenaires, à propos,
     inscription, titres, `index.html`, manifeste, aperçu des annonces,
     emails, fiche Play) au profit de « Côte d'Ivoire » ou de la liste
     `VILLES_PILOTE` (`src/partage/lib/villes.ts`, testée). Restent
     légitimes : siège de Nguessan-IT, tribunal, fuseau horaire. **À
     redéployer** : fonction `envoyer-emails` et site ; gabarits
     `supabase/templates/` à recopier sur le projet distant (porteur).
     Migration `20261120120000_pilote_national_keyli.sql` (villes de la
     vague 2, ville d'une annonce imposée depuis son quartier, gratuité
     du 1er décembre 2026 au 28 février 2027, 30 annonces gratuites en
     ligne, option A à la fin) : 16 tests + 5 fichiers de tests de
     forfaits rejoués sur la base distante en transaction annulée (tous
     OK). Interface web et mobile : statuts `gratuite_pilote` /
     `plafond_pilote`, erreur `KY005`, ville déduite du quartier.
     **Pas encore en ligne** ; types à régénérer ensuite.
     Pixels Meta/TikTok avec bandeau de consentement : faits
     (`src/lib/suivi.ts`, dossier section 9) ; identifiants à fournir par
     le porteur dans `.env`. Correction : Connexion, Inscription et
     PanneauPhotos avaient été reformatés au mauvais style (guillemets
     doubles, points-virgules) le 2026-11-14 : style du projet rétabli.
- Vérifié : types mobile et web, 59 tests, lint, `npm run build`,
  `expo export --platform android` ; accueil, Messages, Conversation et
  formulaire de contact essayés dans l'aperçu navigateur (compte du
  porteur). **Non vérifiable dans le navigateur** : la carte (aperçu photo)
  — à essayer sur le téléphone.
- Prochaine étape : essai sur téléphone, demande de visite dans le fil
  mobile (`PanneauVisite` du web), suppression des annonces fictives,
  nouvelle compilation bêta.

### Session du 2026-11-15 — comptes Meta, TikTok reporté
- Migration du pilote national **en ligne** (confirmé par le porteur).
- Meta, sous le portefeuille Nguessan-IT : pixel « Keyli »
  (2258767188386737, écrit dans `.env`), Page Facebook « Keyli »,
  compte publicitaire en euros (pas de XOF chez Meta), fuseau Abidjan.
  Détail : `docs/MODULES/publicite-pilote-villes.md` section 9.
- TikTok **reporté** (décision du porteur) : la Côte d'Ivoire n'est pas
  proposée à l'inscription TikTok Ads ; budget TikTok reporté sur Meta.
- Bandeau et politique de confidentialité : ne citent TikTok que s'il est
  configuré (`nomsOutils()` dans `src/lib/suivi.ts`).
- Vérifié : types web, 66 tests ; dans le navigateur (base distante),
  bandeau « Meta » seul, rien chargé avant le choix, après « Accepter »
  PageView envoyé au pixel Keyli.
- **Korhogo et Daloa ouvertes dès le pilote** (décision du porteur) :
  migration `20261121120000_villes_korhogo_daloa_keyli.sql` (communes +
  quartier « Centre »), tests pgTAP 5/5 sur la base distante en
  transaction annulée ; `VILLES_PILOTE` complétée. **Migration pas encore
  en ligne** (`supabase db push` par le porteur).
- Prochaine étape : lint + `npm run build` + `expo export`, commit et
  fusion de `feature/pilote-national` (avec l'accord du porteur), puis
  `npm run deploy` et redéploiement de `envoyer-emails`.

### Session du 2026-11-15 (suite) — déploiement, compilations, fiche Google Play
- Web redéployé (`npm run deploy`) après libération d'espace disque ;
  cache `npx` de wrangler corrompu par le disque plein, vidé.
- Compilations Codemagic iOS (TestFlight) et Android (test interne)
  lancées sur `main` : réussies (confirmé par le porteur).
- Fiche Google Play par défaut complétée et enregistrée (brouillon) : icône
  Keyli, image de présentation « en Côte d'Ivoire » (au lieu de « à
  Abidjan »), 7 captures, textes aux six villes du pilote
  (`apps/mobile/fiche-store/`).
- Reste au porteur : « Suivant » → déclaration des éléments d'IA →
  « Enregistrer », puis envoi à l'examen depuis « Vue d'ensemble de la
  publication ». La capture `01-bienvenue` dit encore « à Abidjan » (à
  retirer ou reprendre).

### Session du 2026-11-18/19 — Sprint 19 : réservation de séjours sur mobile
- Branche `feature/sprint19-reservation-mobile`. L'app mobile réserve
  comme Booking : dates d'arrivée et de départ, voyageurs, devis calculé
  par la base, « Demander à réserver », suivi dans « Mes réservations »
  (Profil), réponses de l'hôte (accepter / refuser / annuler avec motif).
- Règle de blocage du calendrier mise en commun web / mobile
  (`limiteDepartSejour`, `jourBloqueSejour`, testées).
- Notifications `reservation_*` → écran Réservations (`push.ts`).
- Textes de la fiche Play réécrits (séjours, hôtels, auberges, résidences
  meublées, réservation dans l'app) : `apps/mobile/fiche-store/textes-play.md`.
- Contrôles : 68 tests partagés, `typecheck` mobile, `tsc` web,
  `expo export --platform android`. Écran Réservations vérifié dans
  l'aperçu web du mobile.
- Blocage : aucune annonce `sejour_court` en base distante → la carte de
  réservation n'a pas pu être essayée avec de vraies données. Publier une
  annonce de séjour court (hôtel ou résidence meublée) pour la tester.
- Suite : fusion dans `main`, nouvelles compilations Codemagic, coller les
  textes dans la Play Console. Plus tard : terrains et espaces
  événementiels (réservation à la journée, change le schéma).

### Session du 2026-11-19 — Sprint 20 : conformité des boutiques
- Branche `feature/sprint20-conformite-stores`. Écran de démarrage animé
  et Sprint 19 fusionnés dans `main` ; permission AD_ID bloquée (Android).
- Fait : suppression de compte (migration
  `20261122120000_conformite_stores_keyli.sql`, fonction Edge
  `supprimer-compte`, page publique `/suppression-compte`, écrans web et
  mobile), blocage et signalement d'un utilisateur (web + mobile),
  « Signaler cette annonce » sur la fiche mobile. Détail :
  `docs/MODULES/conformite.md`.
- Tests pgTAP en retard sur le pilote national corrigés
  (`audit_securite`, `communes_quartiers`, `stabilisation_pilote`) : 49
  fichiers, 877 tests, tous verts en local.
- `types.ts` : la CLI 2.118 produit désormais une sortie non formatée
  (en local comme en CI). Le fichier est committé tel que généré — ne
  pas le reformater, sinon le contrôle « types à jour » de la CI échoue.
- Reste (avec accord du porteur) : migration et fonction Edge sur le
  distant, fusion dans `main`, déploiement web, compilations Codemagic.
- Play Console : « Sécurité des données » (URL de suppression ci-dessus),
  fin de la classification (blocage et signalement : Oui). Le porteur
  remplit les informations de connexion (compte de test) et le statut
  de professionnel, puis « Cible et contenu ».
- Décision du porteur (2026-11-20) : paiement des forfaits sur le site
  seulement. L'écran Abonnement mobile est en lecture seule sur Android
  comme sur iPhone (`docs/MODULES/mobile.md`, Sprint 17).

### Session du 2026-11-20/21 — mise en production du Sprint 20, test fermé Android
- Production : migration `20261122120000_conformite_stores_keyli.sql`
  appliquée, fonction `supprimer-compte` déployée, site redéployé
  (`/suppression-compte` répond). Sprint 20 fusionné dans `main`, CI verte.
- Compilation Android n°5 (Codemagic, commit `f3cddda`, sans Paystack) :
  réussie, bundle 5 (0.1.0) dans la Play Console.
- Play Console : classification IARC transmise (12+, sans achat dans
  l'app) ; « Sécurité des données » remplie en brouillon (envoi bloqué
  tant que « Cible et contenu » n'est pas rempli).
- Test fermé « Alpha » : 178 pays ciblés (Côte d'Ivoire, France et reste
  du monde — voyageurs et touristes) ; liste « Testeurs Keyli » cochée
  (3 adresses, il en faut au moins 12) ; version brouillon avec le
  bundle 5 et des notes en français.
- Fait ensuite : informations de connexion (compte de test) et statut de
  professionnel (porteur) ; « Cible et contenu » (18 ans et plus) et
  « Sécurité des données » enregistrées ; email de commentaires des
  testeurs `contact@keyli.com` (boîte à créer par le porteur avant le
  lancement officiel).
- Fiche Play : catégorie « Maison et intérieur », coordonnées publiques
  `contact@keyli.com` et `https://keyli-2gc.pages.dev`.
- 2026-11-21 : 16 modifications envoyées à l'examen de Google (accord du
  porteur), dont la version Alpha 5 (0.1.0). Examen annoncé sous 7 jours.
- Avertissement Play ignoré (« résolution prévue ») : `orientation:
  portrait` (`apps/mobile/app.json`) rend `android.hardware.screen.portrait`
  obligatoire et exclut certains appareils (ordinateurs, XR, quelques
  tablettes). Corrigé (plugin `apps/mobile/plugins/ecranPortraitFacultatif.js`,
  `required="false"`) : effectif à la prochaine compilation Android.
- Accueil mobile (iOS et Android, décision du porteur) : cartes de
  catégories à la manière de Booking au lieu du catalogue — Séjourner
  (séjour à la nuit, hôtels, auberges, résidences meublées), Se loger
  (louer, acheter), Professionnels (bureaux, magasins). Chaque carte ouvre
  la recherche filtrée. Liste commune web/mobile :
  `src/partage/lib/categories.ts` (testée). Hôtels et auberges sont deux
  cartes : la recherche ne filtre que sur un type à la fois. Plus tard :
  restaurants partenaires et terrains (évolution du schéma). Effectif à la
  prochaine compilation (n°6).
- Ensuite (même jour, branche `feature/categories-terrains-crash-android`) :
  - **Plantage Android à l'ouverture** (« se ferme aussitôt », version 5) :
    reproduit sur l'émulateur Pixel_7 avec l'APK universel. Cause : Expo
    SDK 58 active R8 en publication (`android.enableMinifyInReleaseBuilds`),
    qui casse WorkManager (« Failed to create an instance of class
    androidx.work.impl.WorkDatabase »). Correctif : plugin
    `apps/mobile/plugins/sansReductionCodeAndroid.js` (R8 et réduction des
    ressources désactivés). Effectif à la compilation n°6, qui doit
    remplacer la 5 dans la release Alpha (accord du porteur).
  - **Risque restant** : react-native-maps sur Android sans clé Google
    Maps (`android.config.googleMaps.apiKey` absent de `app.json`) — la
    carte de la Recherche et le choix de position à la publication
    risquent de planter. À vérifier sur la n°6 ; clé à créer par le
    porteur dans Google Cloud si besoin.
  - Une seule carte « Hôtels & auberges » : nouveau paramètre `p_types`
    (liste de types) de `rechercher_annonces_keyli` ; carte « Terrains »
    (type `terrain` ajouté à `property_type_keyli`, à vendre). Migration
    `20261123120000_terrains_categories_keyli.sql` + test pgTAP. Pour un
    terrain, la publication masque pièces, salles de bain, meublé et
    séjour court (web et mobile).
  - 2026-11-22 : migration appliquée en production (porteur), test pgTAP
    distant vert (5/5). Compilation Android n°6 (Codemagic, `9141b87`)
    réussie, bundle 6 en brouillon dans la Play Console. APK universel 6
    sur émulateur : plus de plantage WorkDatabase (l'app tourne ~20 s
    sans erreur), puis la protection automatique de Google Play
    (`com.pairip.licensecheck`) ferme toute copie non installée depuis le
    Play Store — le parcours complet ne peut se tester que via le test
    interne ou Alpha (téléphone du porteur).
  - Clé Google Maps Android (créée par le porteur, restreinte à
    `com.keyli.app` + SHA-1 de la clé de signature Play
    `2E:FE:06:E1:…:24:38`, et à Maps SDK for Android) ajoutée dans
    `apps/mobile/app.json` (`android.config.googleMaps.apiKey`).
  - Compilation Android n°7 (`22d1b71`) : release Alpha « 7 (0.1.0) »
    remplace la 5, envoyée à l'examen le 2026-11-22 (accord du porteur).
    Taille d'installation 21,4 → 28,4 Mo (R8 désactivé).
  - Compilation iOS (Codemagic, même commit) réussie et envoyée sur
    TestFlight (demande du porteur).
  - Ouverture de l'app mobile (décision du porteur, 2026-11-22) : un
    visiteur non connecté arrive sur la page de connexion (l'écran de
    bienvenue à photos est retiré) ; une fois connecté, sur l'onglet
    Accueil. Lien « Découvrir les annonces sans compte » conservé
    (consultation libre, PRD ; exigence App Store 5.1.1). Contexte
    `apps/mobile/src/navigation/explorer.ts`. Compilations Android n°8 et
    iOS lancées.
  - Retour du porteur : la page de connexion (premier écran) reprend les
    photos en fond de l'ancien écran de bienvenue, formulaire sur une carte
    blanche (`apps/mobile/src/screens/Connexion.tsx`). Icône Android :
    fond blanc (`android.adaptiveIcon.backgroundColor`).
  - Puis le porteur précise (capture à l'appui) : le premier écran voulu
    est l'écran de bienvenue (photos, « Créer un compte », « Se
    connecter », « Découvrir les annonces sans compte »). Bienvenue
    restauré tel qu'au commit `f474c83` ; page de connexion redevenue
    simple ; une fois connecté, l'app s'ouvre sur l'onglet Accueil. Icône
    Android sur fond blanc conservée. Compilations Android et iOS lancées.
  - Version Alpha 9 (Bienvenue au démarrage, icône sur fond blanc) envoyée
    à l'examen Google le 2026-11-22.
- Connexion Google, Apple, Facebook (demande du porteur, 2026-11-22,
  branche `feature/connexion-sociale`) :
  - Mobile : `services/native/connexionSociale.ts` (iPhone + Apple : fenêtre
    native `expo-apple-authentication` → `signInWithIdToken` ; sinon page du
    fournisseur dans le navigateur sécurisé, retour `keyli://auth`) ;
    composant `BoutonsSociaux` sur Bienvenue et Connexion ;
    `ios.usesAppleSignIn` activé.
  - Web : `useConnexionFournisseur` (`useCompte.ts`) + trois boutons sur
    la page Connexion.
  - Migration `20261124120000_connexion_sociale_keyli.sql` (noms lus chez le
    fournisseur) : à appliquer en production par le porteur.
  - Configuration à faire par le porteur (aucun secret dans le code) :
    fournisseurs Google, Apple, Facebook dans Supabase ; adresses
    `keyli://auth` et celle du site dans les URL de redirection autorisées ;
    clients OAuth Google ; Services ID + clé Apple (et `com.keyli.app` dans
    les Client IDs Apple de Supabase) ; application Meta.
  - Non testé de bout en bout : dépend de cette configuration.
  - 2026-11-23 : configuration faite. Google : client OAuth « Keyli
    Supabase » dans le projet Google Cloud Nguessan-IT (partagé avec d'autres
    apps, choix du porteur), app publiée « En production ». Apple : Services
    ID + clé, secret généré par `scripts/generer-secret-apple.mjs` (expire
    tous les 6 mois). Facebook : app Meta `1120244434237385` (email,
    adresse de retour, liens légaux) NON publiable tant que Nguessan-IT
    n'est pas immatriculée (vérification d'entreprise + Contrôle app) →
    bouton masqué (`FACEBOOK_ACTIF` dans `src/partage/lib/connexionSociale.ts`).
    Codes saisis dans Supabase par le porteur.
  - Compilations : Android #10 réussie, Alpha 10 préparée sur Google Play
    (bundle 10, remplace 9 ; pas encore envoyée à l'examen). iOS #13 en
    échec (erreur 65) : le profil chargé à la main `keyli_app_store_push`
    n'avait pas « Sign in with Apple » → profil régénéré chez Apple et
    rechargé sous le même nom par le porteur ; iOS (version 15) envoyé sur
    TestFlight le 2026-11-24. Avertissement Apple 90725 : à partir d'avril
    2027, compiler avec le SDK iOS 27 (Codemagic est en `xcode: latest`).
  - Bug signalé (iOS) : compte supprimé resté connecté, déconnexion
    impossible. Corrections : `useDeconnexion` ferme toujours la session
    locale même si le serveur refuse ; `useSupprimerCompte` la ferme aussi
    sur 401 ou « Compte vidé… » ; Profil mobile : retrait du jeton push
    limité à 4 s avant la déconnexion ; fonction `supprimer-compte`
    (redéployée le 2026-11-24) : bannissement d'abord, email anonymisé
    ensuite (échec journalisé, non bloquant), puis révocation de toutes
    les sessions (`admin.signOut(jeton, 'global')`). Nouveau workflow
    Codemagic `ios-simulateur` (.app non signé) : compile, mais App Preview
    exige un compte « équipe » Codemagic → non utilisé.
    Second essai du porteur (TestFlight 15, ancien code mobile) : profil
    vidé mais session restée, erreur masquée en « erreur inattendue ».
    Cause probable : le bannissement partait dans le même appel que le mot
    de passe aléatoire (refusable par les règles de mot de passe). Fonction
    redéployée : bannissement seul d'abord. Filet de sécurité dans
    `useProfil` : un profil avec `compte_supprime_le` ferme la session
    locale au chargement (débloque les téléphones déjà coincés après mise
    à jour). Erreurs de suppression affichées telles quelles
    (`erreurKeyli`) ; déconnexion serveur limitée à 5 s.
    Troisième retour : suppression toujours bloquée et identifiant Apple
    refusé ensuite (compte banni = identité Apple liée pour toujours).
    Fonction redéployée : suppression douce Supabase
    (`admin.deleteUser(id, true)`), bannissement en simple repli. Comptes
    déjà bannis : le porteur lance `scripts/finaliser-suppressions.mjs`
    avec sa clé service_role dans l'environnement. Nouvelles compilations
    iOS/Android nécessaires pour le code de l'app.
- 2026-11-25 : fiche App Store prête à coller
  (`apps/mobile/fiche-store/textes-app-store.md` : sous-titre, mots-clés,
  notes de vérification, classification, confidentialité) et 7 captures
  1290 x 2796 (`fiche-store/captures-iphone-6.7/`, tirées des captures
  Android). Compilations Android et iOS à lancer par le porteur (commit
  `65b2dc1` ou plus récent).
- Révocation « Se connecter avec Apple » à la suppression (App Store
  5.1.1(v), accord du porteur) : sur iPhone, un compte ouvert avec Apple
  demande une confirmation Apple (`codeApplePourSuppression`,
  `connexionSociale.ts`) ; le code part à `supprimer-compte`, qui l'échange
  puis révoque le jeton chez Apple (`supabase/functions/supprimer-compte/apple.ts`,
  secret client ES256 généré à chaque appel). Échec non bloquant
  (journalisé). Fonction déployée. **À faire par le porteur** : secrets
  `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (contenu du .p8)
  dans Supabase → Edge Functions → Secrets ; sans eux, l'étape est sautée.
  Fait le 2026-11-26 : `APPLE_KEY_ID` (clé `2S8VYWBH83`, Sign in with
  Apple) et `APPLE_PRIVATE_KEY` (posé en une ligne via la CLI, le tableau
  de bord refusant le texte sur plusieurs lignes) ; Team ID repris de
  `APNS_TEAM_ID`. À valider par un essai réel sur TestFlight.
- 2026-11-26 : compilations iOS et Android lancées par le porteur (commit
  `d70a4ae`, suppression de compte corrigée + révocation Apple). Suite :
  nouvelle version Android à la place de l'Alpha 10 puis examen Google ;
  fiche App Store Connect (`textes-app-store.md`) puis soumission Apple —
  chaque envoi avec l'accord du porteur.
- 2026-11-26, état des soumissions :
  - Google Play : Alpha 12 (bundle 12) envoyée à l'examen, avec accord.
  - App Store Connect (app 6832900979), enregistré : build 17, version
    0.1.0, textes, URL, notes de vérification, sous-titre, catégories,
    confidentialité publiée (11 types), classification 13+, droits sur le
    contenu (contenus tiers), prix gratuit, 175 pays.
  - Captures (1206 x 2622, `captures-iphone-6.3/`), compte de test et
    coordonnées saisis par le porteur ; Chine continentale retirée
    (174 pays) ; statut DSA déclaré « non-commerçant » par le porteur
    (→ app non distribuée dans l'UE tant que ce statut n'est pas changé).
  - **iOS 0.1.0 (build 17) envoyée à la vérification d'Apple le
    2026-11-26**, avec l'accord du porteur. Publication **manuelle** après
    approbation (bouton « Publier cette version » dans App Store Connect).
    Délai annoncé : jusqu'à 48 h.
  - Statut DSA : « non-commerçant » faute de mieux — la vérification par
    SMS d'Apple échouait (3 essais). À refaire en commerçant (voir les
    pistes : Business → Conformité du compte, autre numéro, assistance
    Apple Developer) pour ouvrir l'UE.
- Reste : emails des testeurs (porteur). Puis 14 jours de test avec 12 testeurs actifs avant
  de demander l'accès à la production. iOS : non relancé.

### Session du 2026-11-26 — animations expressives du site web

Branche `feature/animations-expressives`, 4 lots validés par le porteur,
détail dans `docs/ANIMATIONS.md` (section « Animations expressives ») :
- Lot 1 : la photo de la carte voyage jusqu'à la fiche et revient
  (API View Transitions, hook `src/hooks/useNavigationPartagee.ts` — l'option
  `viewTransition` de React Router n'agit pas avec `BrowserRouter`) ;
  préchargement de la fiche au survol ; squelette de fiche ; rideau
  raccourci et réservé à l'accueil, la connexion et l'inscription.
- Lot 2 : `Apparition` (panneau, bandeau, volet) pour notifications,
  partage, consentement, menu mobile, volets de formulaire.
- Lot 3 : `IndicateurActif` (pastille qui glisse), onde du favori,
  réordonnancement animé de la recherche et des photos, bulles de messages.
- Lot 4 : `Squelettes` (cartes, lignes) à la place de « Chargement… ».
- Vérifié : tsc, eslint, 73 tests Vitest, build ; aller-retour carte →
  fiche → recherche dans le navigateur sans erreur. Mouvements réduits
  respectés partout.
- À faire : regarder les transitions à l'œil sur un vrai écran (le
  navigateur de contrôle était masqué), puis `npm run deploy`.

### Session du 2026-11-26 (suite) — double authentification des admins

Décision du porteur : second facteur obligatoire pour admin et super_admin
(détail `docs/MODULES/admin.md`, section « Double authentification »).
- Migration `20261126120000_mfa_admin_keyli.sql` : `est_admin_keyli()` et
  `est_super_admin_keyli()` exigent `aal2`. **Pas encore appliquée en ligne.**
- Site : `/admin` guide l'enrôlement (QR code) puis demande le code.
- Vérifié : tsc, eslint, Vitest (nouveaux tests `doubleAuth`), build ; tests
  SQL rejoués sur la base distante dans des transactions annulées (Docker
  indisponible) : 19 fichiers identiques avant/après, 6 nouveaux cas OK.
  Échecs préexistants liés aux données en ligne : admin_keyli (1),
  moderation_comptes (1), conversion_annonces (1), audit_securite (1).
- **Mise en ligne, dans cet ordre** : `npm run deploy`, puis
  `npx supabase db push --linked`, puis enrôlement du super_admin sur /admin.
- Suite envisagée : console `admin.keyli.com` + Cloudflare Access après achat
  du domaine ; rôles intermédiaires (modération, support) à décider.

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
