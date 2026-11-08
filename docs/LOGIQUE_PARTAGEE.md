# Logique partagée web ↔ mobile (Sprint 10)

Objectif du calendrier : « couche métier identifiée et documentée pour
réutilisation React Native » (`docs/calendrier.md`, Sprint 10). Décision du
porteur (2026-11-08) : cartographie, dossier partagé `src/partage`,
garde-fou automatique, tests unitaires.

Rappel de la règle d'or : la base (RLS, fonctions SQL, Edge Functions) reste
la seule source de vérité. La couche partagée ne décide rien de sensible :
elle interroge la base, met en forme et valide la saisie pour le confort.

## 1. Organisation

```
src/
├── partage/                 COMMUN web + mobile — aucun accès au navigateur
│   ├── hooks/               données et actions (React Query + Supabase)
│   ├── lib/                 règles, validation, formats, libellés (+ tests)
│   ├── plateforme.ts        contrat des services de l'appareil
│   └── supabase.ts          création du client Supabase Keyli
├── plateforme/index.ts      services de l'appareil, version WEB
├── integrations/supabase/   client.ts (version WEB) + types.ts (commun)
├── hooks/  lib/             propre au web (animations, cartes, photos…)
└── components/  pages/      interface web
```

Sens des dépendances : le web dépend du partagé, **jamais l'inverse**.

### Deux points d'entrée fournis par chaque application
Le code partagé importe deux modules que chaque application fournit au même
chemin (alias `@/`), avec la même interface :

| Module | Web (aujourd'hui) | Mobile (Phase 3) |
|---|---|---|
| `@/integrations/supabase/client` | `creerClientKeyli(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` | `creerClientKeyli(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } })` |
| `@/plateforme` (contrat `src/partage/plateforme.ts`) | `localStorage`, `window.location.origin`, `crypto.randomUUID()` | stockage synchrone (MMKV), adresse du site ou lien universel, `expo-crypto` |

`src/integrations/supabase/types.ts` (généré depuis la base) est commun tel
quel.

## 2. Garde-fou automatique
Règle de lint sur `src/partage/**` (`eslint.config.js`), bloquante en CI :
- interdits : `window`, `document`, `localStorage`, `sessionStorage`,
  `navigator`, `location`, `history`, `crypto`, `matchMedia`,
  `IntersectionObserver`, `alert`, `confirm`, `google`, et `import.meta` ;
- imports interdits : `@/components/*`, `@/pages/*`, `@/hooks/*`, `@/lib/*`,
  `@/styles/*`, `react-dom`, `react-router-dom`, `lucide-react`, `motion`.
Vérifié le 2026-11-08 : un fichier volontairement fautif déclenche les 5
erreurs attendues.

## 3. Tests unitaires
Vitest (`npm test`, exécuté en CI avant le build) — fichiers
`src/partage/lib/*.test.ts`, 31 tests : formats, qualité des annonces, dates
de séjour, publication, messagerie, liens de notification, motifs de refus
de paiement, messages d'erreur, inscription, publication d'annonce, filtres
de recherche et alertes. Les mêmes tests valideront le comportement côté
mobile.

## 4. Cartographie

Légende : **Partagé** = réutilisable tel quel ; **Partagé, à vérifier** =
dépend d'une API JavaScript à contrôler sur React Native ; **Web** = propre
au site, équivalent mobile à écrire.

### Hooks de données (`src/partage/hooks/`) — tous partagés
| Fichier | Rôle | Remarque mobile |
|---|---|---|
| `useSession.tsx` | session Supabase, fournisseur de contexte | persistance de session fournie par le client mobile (AsyncStorage) |
| `useProfil.ts` | profil de l'utilisateur connecté | — |
| `useCompte.ts` | inscription, connexion, mot de passe | liens d'email via `plateforme.urlApp` |
| `useCgu.ts` | acceptation des conditions générales | — |
| `useAnnonces.ts` | publication, état du forfait, mes annonces | — |
| `useRecherche.ts` | recherche, fiche, statistiques de consultation | identifiant de session via `@/plateforme` |
| `useFavoris.ts` | favoris | — |
| `useAlertes.ts` | alertes de recherche | — |
| `useConversion.ts` | intentions de contact, annonces similaires, performance | — |
| `useMessagerie.ts` | conversations, temps réel | Supabase Realtime fonctionne sur React Native |
| `useNotifications.ts` | notifications in-app, temps réel | les notifications push seront un canal en plus (MODULES/mobile.md) |
| `useVisites.ts` | visites planifiées | — |
| `useReservations.ts` | séjours courts | — |
| `useVerification.ts` | pièces justificatives | envoi d'un fichier : `File` du navigateur sur le web ; sur mobile, fichier de la caméra (à adapter au moment du code) |
| `useAbonnement.ts` | forfaits, paiement, historique | paiement Paystack : ouvrir l'URL dans un navigateur intégré, retour par lien universel |
| `useTableauDeBord.ts`, `useAgence.ts`, `useDemarrage.ts` | tableaux de bord | — |
| `useEmails.ts`, `useRetours.ts`, `useSupport.ts`, `usePilote.ts` | préférences, retours, support, pilote | — |
| `useAdmin.ts`, `usePaiementsAdmin.ts` | back-office | l'admin reste sur le web en v1 (non prévu sur mobile) |

### Règles et utilitaires (`src/partage/lib/`)
| Fichier | Rôle | Statut |
|---|---|---|
| `validation.ts` | schémas zod des formulaires, libellés des types | Partagé (testé) |
| `recherche.ts` | filtres ↔ paramètres, alertes | Partagé, à vérifier : `URLSearchParams` est incomplet sur React Native (ajouter `react-native-url-polyfill`) |
| `format.ts`, `qualite.ts`, `sejour.ts` | montants, dates, qualité d'annonce | Partagé, à vérifier : formats `Intl` fr-FR sous Hermes (testés sur Node) |
| `erreurs.ts`, `paiements.ts`, `publication.ts`, `messagerie.ts`, `juridique.ts`, `dashboard.ts`, `annonce.ts` | messages, libellés, constantes | Partagé (testé pour la plupart) |
| `notifications.ts` | destination d'une notification, « il y a 5 min » | Partagé : la destination est un chemin du site, que le mobile traduit en écran |

### Propre au web (reste dans `src/hooks/`, `src/lib/`)
| Fichier | Pourquoi | Équivalent mobile |
|---|---|---|
| `lib/cloudinary.ts`, `hooks/usePhotos.ts` | compression d'image par `canvas` | `expo-image-manipulator`, même signature Cloudinary (Edge Function) |
| `lib/googleMaps.ts`, `lib/repereCarte.ts`, `hooks/useConfigCarte.ts` | carte Google Maps JavaScript | `react-native-maps` |
| `lib/journal.ts` | journal des erreurs du navigateur | même fonction SQL `journaliser_erreur_keyli`, capture propre à React Native |
| `lib/documents.ts` | ouverture d'un document dans un onglet | `Linking.openURL` sur `lienDocumentTemporaire` |
| `lib/navigation.ts` | menus et icônes du site | navigation React Navigation |
| `lib/animation.ts`, `lib/cinema.ts`, `hooks/useCountUp.ts`, `hooks/useRevele.ts` | animations web | Reanimated |
| `hooks/useTitrePage.ts`, `hooks/useVueCatalogue.ts`, `lib/utils.ts` | titre de page, préférence d'affichage, classes CSS | sans objet ou préférence via `plateforme.stockage` |

## 5. Règles pour la suite
- Toute nouvelle règle métier ou requête utilisée par un écran va dans
  `src/partage`, avec un test si c'est une fonction pure.
- Un besoin de l'appareil (stockage, adresse, identifiant…) s'ajoute au
  contrat `Plateforme`, jamais par un accès direct.
- Si une règle semble devoir différer entre web et mobile : le signaler
  avant de coder (risque principal de la Phase 3, `MODULES/mobile.md`).
