# MODULE : Pages légales et acceptation des conditions

Livré le 2026-11-04 (branche `feature/pages-legales`).

## Décisions du porteur (2026-11-04)
- **Textes dans le code, versionnés** (pas de table éditable en
  back-office pour l'instant) : `src/pages/juridique/`. Le droit
  « juridique » du super_admin (`docs/ROLES.md`) s'exerce donc par Git.
- **Acceptation à la prochaine connexion** : les comptes existants, et tous
  les comptes à chaque nouvelle version, doivent accepter avant de
  continuer. La consultation publique des annonces reste libre.
- Contact unique : `contact@keyli.com` (pas encore actif, domaine à mettre
  en service — voir `docs/MODULES/emails.md`).

## Pages (groupe `MiseEnPage`, accessibles sans connexion)
| Route | Fichier | Contenu |
|---|---|---|
| `/conditions` | `Conditions.tsx` | CGU : comptes, badge, annonces, forfaits, séjours, rôle d'intermédiaire, signalements, suspension, droit ivoirien |
| `/confidentialite` | `Confidentialite.tsx` | Loi n° 2013-450 du 19 juin 2013, ARTCI, données, finalités, prestataires, transferts hors CI, conservation, droits |
| `/mentions-legales` | `MentionsLegales.tsx` | Éditeur Nguessan-IT, hébergeurs, propriété intellectuelle |
| `/aide` | `Aide.tsx` | Questions fréquentes + contact |

Gabarit commun `src/components/juridique/PageJuridique.tsx` (sommaire,
sections numérotées, date de version). Liens dans le pied de page public.

Les informations inconnues sont affichées « À COMPLÉTER » en surligné
(`ACompleter.tsx`) : forme juridique et capital, RCCM, adresse postale,
numéro de récépissé ARTCI. **Ne pas ouvrir au public avant de les avoir
remplies.**

## Version et acceptation
- Version en vigueur : `VERSION_CGU = '2026-11-04'` (`src/lib/juridique.ts`)
  **et** `public.version_cgu_keyli()` (base). Les deux doivent rester
  identiques.
- `profiles_keyli.cgu_version` / `cgu_acceptees_at` : aucun droit
  d'écriture direct.
- Inscription : case obligatoire ; la version part dans les métadonnées
  (`cgu_version`) ; le déclencheur `trg_cgu_a_inscription` l'enregistre
  seulement si c'est la version en vigueur.
- Connexion : `PorteCgu` (dans `MiseEnPage` et `CadreConnecte`) remplace la
  page demandée par l'écran d'acceptation tant que
  `cgu_version ≠ VERSION_CGU` ; les pages légales restent lisibles.
  L'acceptation appelle `accepter_cgu_keyli(p_version)` (refuse une version
  périmée, 22023 ; non connecté, 42501).

## Publier une nouvelle version
1. Modifier les textes, `VERSION_CGU` et `DATE_VERSION_CGU`.
2. Migration qui remplace `version_cgu_keyli()` par la nouvelle date.
3. Déployer la base **puis** le site (sinon, entre les deux, l'écran
   d'acceptation renvoie « version plus en vigueur »).

## À faire avant l'ouverture au public
- [ ] Relecture des quatre textes par un juriste (droit ivoirien).
- [ ] Déclaration du traitement auprès de l'ARTCI, et autorisation des
      transferts hors de Côte d'Ivoire si nécessaire ; reporter le numéro.
- [ ] Compléter les mentions « À COMPLÉTER ».
- [ ] Activer `contact@keyli.com`.
- [ ] Plus tard : fermeture de compte en libre-service (aujourd'hui par
      email).
