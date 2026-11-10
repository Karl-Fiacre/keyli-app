# MODULE : Mobile React Native (Phase 3)

⚠️ Module trouvé manquant lors d'un rescan — `STRUCTURE_FRONTEND.md`
décrit l'arborescence cible et `.claude/rules/react-native-mobile.md`
donne les conventions de code, mais aucun fichier ne détaillait les
modules natifs, la distribution bêta et la soumission stores. Ne pas
commencer la Phase 3 sans ce fichier.

## Prérequis avant toute ligne de code mobile
- [ ] Phase 2 réellement terminée — aucun bug bloquant connu côté web (voir
      `etat_avancement.md`)
- [x] Logique métier déjà extraite en hooks/services partageables pendant
      la Phase 2 — fait au Sprint 10 (2026-11-08) : `src/partage/`, voir
      `docs/LOGIQUE_PARTAGEE.md`
- [x] IDs d'applications confirmés par le porteur le 2026-11-08 :
      `com.keyli.app` (Android et iOS) — voir STACK.md, irréversible une fois
      publié

## Sprint 13 — socle du projet mobile (2026-11-08)
Périmètre choisi par le porteur : projet Expo et logique partagée,
navigation de base, connexion et inscription, charte visuelle mobile.
- **Projet** : `apps/mobile/`, Expo SDK 58 (React Native 0.88, React 19,
  TypeScript 6), dépendances propres au mobile (`apps/mobile/node_modules`).
  **Node 22.13 ou plus** exigé par React Native 0.88 (Node 20 ne donne qu'un
  avertissement, mais n'est plus pris en charge).
- **Logique partagée** : `metro.config.js` surveille `src/partage` et
  `src/integrations/supabase` du web et résout les alias `@/…` ; le mobile
  fournit `@/integrations/supabase/client` et `@/plateforme`
  (`apps/mobile/src/`). Bibliothèques toujours prises dans
  `apps/mobile/node_modules` (une seule copie de React). Alias de
  `tsconfig.json` ignorés par Metro (`experiments.tsconfigPaths: false`) :
  ils ne servent qu'au contrôle des types.
- **Session** : coffre de l'appareil (`expo-secure-store` : Keychain iOS,
  Keystore Android), valeur découpée en morceaux de 1 800 caractères (limite
  d'environ 2 Ko par entrée) — `src/services/native/stockageSecurise.ts`.
  Renouvellement du jeton au premier plan seulement.
- **Plateforme** : stockage synchrone `expo-sqlite/kv-store` (inclus dans
  Expo Go, à la place de MMKV qui ne l'est pas), identifiants `expo-crypto`,
  liens des emails vers le site (`EXPO_PUBLIC_KEYLI_SITE_URL`).
- **Navigation** (React Navigation 7) : onglets Accueil, Recherche, Messages,
  Profil ; fiche annonce ; parcours de compte en fenêtre (connexion,
  inscription, mot de passe oublié) qui se referme à la connexion ; écran
  d'acceptation des CGU avant le reste si la version acceptée n'est pas
  celle en vigueur (même règle que `PorteCgu` du web). Consultation des
  annonces libre, comme sur le web.
- **Écrans** : mêmes hooks et mêmes schémas que le web (aucune règle
  recopiée). Messages et gestion du profil renvoient vers le site en
  attendant leurs sprints ; la fiche propose « Contacter l'annonceur sur le
  site » (le téléphone de l'annonceur reste privé).
- **Charte** : `src/theme/tokens.ts` (tokens du web convertis), composants de
  base `src/composants/base.tsx`, icône et écran de démarrage navy
  `#1a1f2e` (LOGO.md).
- **Déplacés dans `src/partage`** pour ne rien recopier : `lib/photos.ts`
  (`urlPhoto`, testé) et `lib/roles.ts` (libellés des rôles).
- **CI** : job « Application mobile » (Node 22) — `npm run typecheck` (types
  du mobile et de `src/partage` vus du mobile) et
  `npx expo export --platform android` (assemblage Metro complet).
- **Vérifié** : types, assemblage Android (3,6 Mo), et dans le navigateur
  (`expo start --web`, base en ligne en lecture) : accueil interrogeant
  `rechercher_annonces_keyli`, onglets, recherche, invitation à se connecter,
  validations de connexion et d'inscription. **Validé par le porteur sur son
  téléphone (Expo Go, 2026-11-09)** : connexion réelle, session retrouvée
  après fermeture complète de l'application.

### Lancer l'application sur le téléphone (porteur)
1. Node 22 LTS installé ; `cd apps/mobile`, `npm install` ;
2. `apps/mobile/.env` à partir de `.env.example` (adresse et clé publique
   anon seulement) ;
3. `npx expo start --port 8082`, puis scanner le QR code avec Expo Go
   (Android) ou l'appareil photo (iPhone), téléphone et PC sur le même
   Wi-Fi. Port 8082 : le 8081 par défaut est souvent pris par un autre
   projet (serveur Vite), ce qui bloquait le chargement à 22 %. Premier
   assemblage long (≈ 3 min 30 sous Node 20), puis rapide grâce au cache.
   Si le téléphone ne joint pas le PC : `npx expo start --tunnel`.

## Sprint 14 — catalogue mobile (2026-11-09)

Périmètre choisi par le porteur : filtres complets, carte native, favoris et
alertes, fiche enrichie. Tout passe par les hooks partagés (aucune requête
propre au mobile).

| Écran / composant | Contenu | Logique partagée utilisée |
|---|---|---|
| `screens/Recherche.tsx` | bouton Filtres (nombre actif), bascule liste / carte, tri, nombre de résultats, pages, alerte | `useRecherche`, `nombreFiltresActifs`, `LIBELLES_TRI`, `TAILLE_PAGE` |
| `composants/PanneauFiltres.tsx` | mêmes filtres que le web, dans un brouillon appliqué par « Afficher » (une seule recherche) ; une arrivée sans départ ne filtre pas | `useCommunes`, `useQuartiers`, `useAvantages` |
| `composants/CalendrierSejour.tsx` | arrivée puis départ, jours passés grisés | `grilleMois`, `choisirJourSejour`, `ajouterMois` (`sejour.ts`) |
| `composants/CarteAnnonces.tsx` | `react-native-maps`, pastille de prix (navy si vérifiée), aperçu de l'annonce touchée, zoom limité à 16 | `usePositionsAnnonces` (positions approximatives) |
| `composants/CarteAnnonces.web.tsx` | message à la place de la carte dans l'aperçu navigateur | — |
| `composants/BoutonAlerte.tsx` | créer, réactiver, « alerte active » ; sans compte → connexion | `etatBoutonAlerte`, `useCreerAlerte`, `useBasculerAlerte`, `useMesAlertes` |
| `screens/FicheAnnonce.tsx` | galerie plein écran (`GaleriePleinEcran`), badge officiel, favori, partage, annonces similaires | `useAnnoncesSimilaires`, `useVueAnnonce` |
| `screens/Favoris.tsx`, `screens/Alertes.tsx` | depuis le profil ; « Voir les annonces » ouvre la recherche filtrée | `useMesFavoris`, `libelleAlerte`, `filtresDepuisAlerte` |
| `composants/BadgeVerifie.tsx` | badge officiel (`react-native-svg`) — jamais décoratif | — |

Provenance des visites (`interactions_keyli.source`) : liste et favoris →
`search`, carte → `map`, annonces similaires → `recommandation`, lien
partagé → `lien_direct`.

**Vérifié** : types, assemblage Android (3,9 Mo), panneau de filtres,
calendrier, commune → quartiers, bascule carte (aperçu navigateur, sans
erreur). La base en ligne n'a encore aucune annonce publiée : cartes
d'annonces, fiche enrichie et carte native sont à essayer sur le téléphone
dès qu'il y a des annonces.

**Carte hors Expo Go** : Expo Go fournit sa propre clé Google Maps sur
Android. Une version installable (Sprint 18) demandera une clé « Keyli –
Android » restreinte au paquet `com.keyli.app` et au SDK Maps Android, posée
dans `app.json` (`android.config.googleMaps.apiKey`) — à créer par le
porteur dans le projet Google Cloud « Nguessan-IT ». iOS utilise Apple Plans
(aucune clé).

**Formats de date** : `formatJourCourt` et les noms de mois passent par
`toLocaleDateString('fr-FR')` ; à contrôler sur le téléphone (Hermes).

### Écran de bienvenue (2026-11-09, demande du porteur)
Premier écran d'un visiteur non connecté (`screens/Bienvenue.tsx`) :
trois photos de logements en défilement (`composants/DefilementPhotos.tsx` :
fondu enchaîné toutes les 6 s, zoom très léger (4 %), voile navy pour la lisibilité,
repères turquoise au-dessus du texte ; zoom coupé si le téléphone demande de
réduire les animations), logo blanc, promesse du site (« Le
logement de confiance, vérifié avant vous. »), badge officiel avec la
garantie, boutons « Créer un compte » et « Se connecter ». La consultation
restant libre comme sur le web, « Découvrir les annonces sans compte » ouvre
l'application. Navigation : l'écran disparaît dès la connexion (écrans
conditionnels de la pile) et revient après une déconnexion ; le parcours de
compte se referme quand la session change (`navigationKey`). Nouveaux
jetons : `texteClair`, `bordureClaire` (blanc à 80 % et 20 % sur le navy) ;
variantes de bouton `clair` et `contour`.

Photos (choisies par le porteur le 2026-11-09, remplaçant l'illustration
vectorielle d'origine) : `assets/bienvenue-1.jpg` à `-3.jpg`, 1200×1200
(format carré, sans agrandissement), environ 240 Ko chacune, sous
**licence Unsplash** (usage commercial gratuit, sans attribution
obligatoire — crédits conservés ici par correction) :
1. villa tropicale à l'heure bleue — Jusuf Bachtiar,
   unsplash.com/photos/nyceoSzBZxk ;
2. duplex éclairé de nuit — Naksha Banwao, unsplash.com/photos/3ddHcjHmiGw ;
3. maison à toit-jardin — Hardik Panchal, unsplash.com/photos/gto28gGSTcY.
Les photos sont affichées dans un cadre carré sur toute la largeur, son bas
calé à 58 % de la hauteur, fondu dans le navy en haut et en bas : les deux
premières sont entières, la troisième (16:9 d'origine) est recadrée au
centre. La mention « Abidjan · Côte d'Ivoire » a été retirée à la demande
du porteur (2026-11-10). À remplacer par des photos de biens réels d'Abidjan
dès que Keyli en dispose (droits d'usage écrits du propriétaire ou du photographe).

## Modules natifs requis
| Besoin | Module / API | Notes |
|---|---|---|
| Vérification documentaire (scan pièce) | Caméra native + recadrage | Réutilise la même logique de validation que `validate-property-image` côté serveur |
| Connexion rapide | Face ID (iOS) / Empreinte (Android) | Remplace uniquement la saisie du mot de passe à la connexion — ne remplace jamais la vérification documentaire admin (voir MODULES/verification.md) |
| Notifications push | APNs (iOS) / FCM (Android) | Nouveau message, statut de vérification, expiration d'abonnement — mêmes événements que les notifications email existantes, canal différent |
| Alertes de proximité | Géolocalisation en arrière-plan | Dépend de PostGIS déjà tranché (voir DATABASE.md) — nécessite une permission de localisation continue, à documenter clairement dans le flux de consentement iOS/Android |
| Mode hors-ligne | Cache local des annonces consultées | Pas de mécanisme de synchronisation différée prévu en v1 — lecture seule hors-ligne, pas d'écriture en attente de reconnexion |

## Ce qui est partagé avec le web — ne jamais réécrire
`src/partage/` (hooks de données, règles, validation, formats) et
`src/integrations/supabase/types.ts` ; le mobile fournit seulement
`@/integrations/supabase/client` et `@/plateforme` (voir
docs/LOGIQUE_PARTAGEE.md et .claude/rules/react-native-mobile.md). Si une
règle métier semble devoir différer entre web et mobile, le signaler avant
de coder une version mobile-only — la divergence silencieuse entre les deux
plateformes est le risque principal identifié pour cette phase.

## Distribution bêta (Sprint 18)
```
iOS     → TestFlight, 10-15 testeurs, invitation par email
Android → Play Console, piste de test interne, lien d'opt-in
```
Durée cible : une semaine minimum avant de passer aux corrections
pré-soumission — ne pas raccourcir pour gagner du temps, les retours de
testeurs réels sont la seule validation avant que les deux stores entrent
dans la boucle (délai de review hors de notre contrôle une fois soumis).

## Soumission stores (Sprint 20)
- [ ] Icônes déjà prêtes (`keyli_brand_assets/keyli_app_icon_1024.png` pour
      iOS, `keyli_app_icon_adaptive_foreground_432.png` + fond navy pour
      l'icône adaptative Android) — voir LOGO.md
- [ ] Vérifier les guidelines Apple (App Store Review Guidelines) et Google
      (Play Console policies) avant la soumission, pas après un premier
      rejet — en particulier sur la géolocalisation en arrière-plan et
      l'authentification biométrique, deux points fréquemment scrutés
- [ ] ⚠️ Délai de review hors de notre contrôle (quelques jours à plusieurs
      semaines, risque de rejet nécessitant une resoumission) — voir
      calendrier.md, Sprint 20, "Point de vigilance calendaire"
- [ ] Aucune clé secrète dans le bundle mobile livré aux stores — mêmes
      règles que le web (STACK.md)

## Non couvert ici — à trancher avant le code
- [ ] Stratégie de mise à jour forcée (version mobile obsolète qui ne peut
      plus appeler l'API) — non définie
- [ ] Gestion des notifications push quand l'utilisateur a plusieurs
      appareils — non définie
