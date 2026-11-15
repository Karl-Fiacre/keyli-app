# Module — Dossier de publicité et pilote multi-villes (BROUILLON)

Demande du porteur (2026-11-14) : « préparer le dossier de publicité et le
pilote avec des villes à forte demande en Côte d'Ivoire ».

> **Statut : décisions du porteur prises le 2026-11-14** (section 7).
> Restent ouvertes : les modalités de la gratuité et les quartiers des
> nouvelles villes (section 8).

## ⚠️ Écart avec le PRD — validé par le porteur le 2026-11-14
- PRD (sections 3.1 et 12) : **pilote = Abidjan seul** (panel de 500
  propriétés vérifiées) ; l'extension aux autres villes est la **phase 4**
  et les villes visées sont « à trancher » (section 13).
- Ce dossier propose d'**ouvrir des villes de l'intérieur dès le pilote**,
  par vagues. C'est une anticipation de la phase 4 : à confirmer
  explicitement par le porteur, puis à reporter dans `docs/PRD_REGLES.md`.
- Conséquences techniques (section 6) : la base ne connaît que les communes
  d'Abidjan (+ Bingerville, Songon, Anyama) ; le suivi des visites ne sait
  pas attribuer une visite à une campagne publicitaire.

---

## 1. Les villes : où la demande est la plus forte

Population : recensement RGPH 2021 (chiffres repris par ONU-Habitat et la
presse ivoirienne ; à confirmer sur le rapport de l'INS avant toute
publication). Le déficit national est estimé à environ 690 000 logements
(ministère, 2026), avec des programmes publics de logements sociaux
concentrés sur Abidjan, Bouaké, Yamoussoukro, San-Pédro et Korhogo — signe
d'une demande reconnue dans ces villes.

| Ville | Population (RGPH 2021) | Moteurs de la demande | Pertinence pour Keyli |
|---|---|---|---|
| **Abidjan** (district) | ≈ 5,6 M | Capitale économique, mobilité professionnelle, expatriés, diaspora | Cœur du pilote (PRD) ; toutes les fonctions déjà prêtes |
| **Bouaké** | ≈ 830 000 | 2e ville, université Alassane-Ouattara (étudiants), commerce, retour d'investissements | Forte demande de location à petit budget (étudiants, jeunes actifs) |
| **San-Pédro** | ≈ 390 000 | 1er port d'exportation de cacao, zone industrielle, croissance rapide, cadres mutés | Demande de location meublée et de moyen terme (cadres, missions) |
| **Yamoussoukro** | ≈ 340 000 | Capitale politique, INP-HB (étudiants), administration, événements | Étudiants + fonctionnaires mutés ; séjours courts lors d'événements |
| **Korhogo** | ≈ 440 000 | Pôle du Nord, commerce, université Peleforo-Gon-Coulibaly | Demande réelle mais marché très informel |
| **Daloa** | ≈ 420 000 | Pôle du Centre-Ouest, université Jean-Lorougnon-Guédé, cacao | Idem Korhogo |
| **Grand-Bassam / Assinie** | (petites villes) | Tourisme, week-ends des Abidjanais, diaspora | Uniquement **séjours courts** (fonction déjà prête) |

### Proposition de vagues
1. **Vague 1 — Abidjan** (district complet, déjà couvert par la base) :
   atteindre l'objectif du PRD (500 annonces vérifiées) avant tout.
2. **Vague 2 — Bouaké, San-Pédro, Yamoussoukro** : les trois plus fortes
   demandes hors d'Abidjan, profils complémentaires (étudiants, cadres
   mutés, fonctionnaires). Ouverture seulement si la vague 1 tient ses
   objectifs de vérification.
3. **Vague 3 — Korhogo, Daloa** : prévue après retour d'expérience de la
   vague 2 ; **finalement ouvertes dès le pilote** (décision du porteur du
   2026-11-15, section 7). Même règle : publicité grand public seulement à
   partir de 50 annonces vérifiées dans la ville.
4. **En parallèle, séjours courts — Grand-Bassam et Assinie** : peu
   d'annonces, forte valeur d'image (photos), cible abidjanaise et diaspora.

### Contrainte décisive : la vérification sur le terrain
La promesse de Keyli est « vérifié avant vous ». Une ville n'ouvre que si
l'équipe peut **vérifier les documents et, si promis, les biens** dans
cette ville (agent local, partenaire, ou déplacements planifiés). Ouvrir
une ville sans capacité de vérification exposerait la marque sur sa seule
promesse. → Décision 7.3.

---

## 2. Positionnement et messages

**Promesse (déjà utilisée dans l'app, la page de connexion et les
vidéos)** : « Le logement de confiance, vérifié avant vous. »

| Cible | Douleur | Message principal | Preuve dans le produit |
|---|---|---|---|
| Chercheur (locataire, acheteur) | Arnaques, faux démarcheurs, frais de visite perdus, annonces fantômes | « Fini les arnaques : chaque annonceur Keyli est vérifié. » | Badge vérifié, contact protégé (numéro privé), avis, « Autour de moi » |
| Étudiant (vagues 2-3) | Petit budget, loin de la famille, méfiance | « Ta chambre près du campus, sans démarcheur. » | Recherche par rayon, filtre prix, messagerie dans l'app |
| Cadre muté / mission | Peu de temps, ne connaît pas la ville | « Arrivez dans une ville inconnue avec un logement vérifié. » | Recherche par rayon, séjours courts, visites planifiées |
| Propriétaire | Démarcheurs, mauvais payeurs, visibilité | « Louez plus vite, à des gens sérieux, sans intermédiaire. » | Forfait 5 000 XOF/mois, tableau de bord, badge |
| Agence | Concurrence des démarcheurs informels | « Le badge Keyli distingue les vrais professionnels. » | Forfaits agence, statistiques, leads |
| Diaspora | Acheter ou louer à distance sans se faire escroquer | « Investissez au pays sans vous faire avoir. » | Vérification documentaire, messagerie, vidéos/photos |

**Règle de prudence** : ne jamais promettre dans une publicité plus que ce
que le produit garantit réellement (ex. « vérifié sur le terrain » seulement
pour les biens effectivement visités). À relire avec `docs/MODULES/juridique.md`.

---

## 3. Canaux

Usage des réseaux en Côte d'Ivoire (DataReportal / Meta, fin 2025) : environ
8,4 M de comptes Facebook, TikTok du même ordre, LinkedIn ≈ 1,8 M,
Instagram < 1 M. WhatsApp : usage massif, pas de chiffre public fiable.

| Canal | Rôle | Cible | Remarques |
|---|---|---|---|
| **Facebook + Instagram (Meta Ads)** | Acquisition principale, ciblage par ville et rayon | Chercheurs, propriétaires | Ciblage géographique précis : idéal pour une ouverture ville par ville |
| **TikTok** | Notoriété, jeunes, étudiants | 18-30 ans | Formats verticaux 9:16 déjà produits (`video/out/`) |
| **WhatsApp** | Bouche-à-oreille, partage d'annonces | Tous | Bouton « Partager » déjà présent ; statuts WhatsApp d'ambassadeurs |
| **Google (recherche)** | Capter « location appartement Bouaké » etc. | Chercheurs actifs | Après branchement de keyli.com et Search Console |
| **LinkedIn** | Agences, cadres mutés, entreprises (RH) | B2B | Partenariats « logement des nouveaux arrivants » (port de San-Pédro, entreprises) |
| **Terrain** | Recrutement des annonceurs | Propriétaires, agences | Démarchage direct, réunions d'agences, kakemonos dans les agences partenaires |
| **Campus** | Étudiants (Bouaké, Yamoussoukro) | Étudiants | Ambassadeurs étudiants, rentrée universitaire |
| **Radio de proximité** | Villes de l'intérieur | Propriétaires plus âgés | À évaluer selon budget (vague 2) |

### Ordre : l'offre avant la demande
Une plateforme vide déçoit. Dans chaque ville : **d'abord recruter et
vérifier les annonceurs** (4 semaines environ, terrain + Facebook ciblé
propriétaires/agences), **puis seulement** lancer la publicité vers les
chercheurs, quand la ville compte assez d'annonces vérifiées (seuil à
fixer, décision 7.4).

---

## 4. Créations

| Élément | État |
|---|---|
| 2 pubs de 30 s (voix femme / homme), 16:9 et 9:16 | Faites (`video/`, `docs/MODULES/videos.md`) — montrent Abidjan |
| Vidéo d'accueil 45 s | Faite |
| Captures des stores | Faites (`apps/mobile/fiche-store/`) |
| Déclinaisons par ville (Bouaké, San-Pédro, Yamoussoukro) | À faire : carte de la ville, accroche locale, voix off |
| Visuels fixes (carrés 1:1, stories 9:16) par cible | À faire |
| Pub « Autour de moi » (nouvelle fonction phare) | À faire : c'est la promesse de la marque |
| Kit annonceur (fiche A4, présentation agence) | À faire |
| Grande vidéo de fin de projet | Prévue après publication des apps (mémoire projet) |

Règles : logo et badge officiels uniquement, jamais confondus
(`docs/LOGO.md`) ; photos de vrais biens avec l'accord de l'annonceur, ou
photos sous licence ; biens fictifs signalés comme tels.

---

## 5. Calendrier proposé (à ajuster)

| Période | Abidjan | Bouaké, San-Pédro, Yamoussoukro, Korhogo, Daloa |
|---|---|---|
| Déc. 2026 | Recrutement des annonceurs, vérifications ; apps sur les stores | Repérage : partenaires de vérification, premières agences |
| Janv. 2027 | Lancement de la publicité grand public | Recrutement des annonceurs |
| Févr. 2027 | Optimisation (meilleurs messages, meilleurs canaux) | Lancement de la publicité grand public, ville par ville, dès que le seuil d'annonces est atteint |
| Mars 2027 | Bilan à 3 mois | Bilan par ville |

Dépend de : soumission aux stores (Sprint 20), domaine keyli.com, Paystack
en mode réel (`docs/MISE_EN_PRODUCTION.md`).

## Budget
**200 000 XOF au total, de décembre 2026 à mars 2027** (décision du
porteur), soit 50 000 XOF par mois en moyenne. Pas d'agence : les créations
sont faites en interne (vidéos Remotion), donc pas de poste « créations ».

| Poste | Part | Montant |
|---|---|---|
| Meta (Facebook + Instagram), ciblage ville par ville | 75 % | 150 000 XOF |
| ~~TikTok~~ reporté (voir section 9) : sa part passe sur Meta | 0 % | 0 XOF |
| Terrain et campus (impressions, ambassadeurs) | 20 % | 40 000 XOF |
| Réserve de tests | 5 % | 10 000 XOF |

Répartition dans le temps : décembre surtout pour recruter des annonceurs
(petits montants ciblés propriétaires et agences) ; la publicité grand
public d'une ville ne démarre qu'à **50 annonces vérifiées** dans cette
ville. Avec un budget serré, privilégier une ville à la fois plutôt que
saupoudrer.
Aucun coût par clic ou par contact n'est avancé ici : on le mesurera sur les
deux premières semaines de campagne pour fixer les montants suivants.

## Indicateurs
Repris du PRD (aucun nouveau seuil inventé) : annonces actives vérifiées
(cible pilote 500), taux de vérification, note moyenne — onglet Indicateurs
et `/admin/pilote`. À ajouter pour la publicité : coût par inscription,
coût par annonceur vérifié, coût par contact d'annonceur, **par ville et par
canal**.

---

## 6. Travaux techniques nécessaires

1. **Villes de l'intérieur dans la base** : `communes_keyli` ne contient que
   le district d'Abidjan. Ajouter les villes de la vague 2, leurs communes
   et quartiers (migration + `docs/DATABASE.md`) ; vérifier que la
   recherche, les filtres et la carte gèrent une autre ville qu'Abidjan
   (titres « Logements à Abidjan » écrits en dur sur le web et le mobile).
2. **Attribution des campagnes** : lire les paramètres `utm_source`,
   `utm_campaign` à l'arrivée sur le site et sur l'app et les rattacher à
   l'inscription (aujourd'hui, `source` ne connaît que search, map,
   recommandation, lien_direct, quartier_tendance). Sans cela, impossible de
   savoir quelle publicité rapporte quoi.
3. **Pixel Meta / TikTok** : consentement obligatoire (bandeau cookies,
   politique de confidentialité, Content-Security-Policy à élargir) ; à
   décider (7.5) — alternative sans pixel : mesure par liens UTM seulement.
4. **Pages d'arrivée par ville** : `/bouake`, `/san-pedro`, etc. (référencement
   local et cible des publicités).
5. **Déclinaisons vidéo par ville** dans `video/` (carte, accroche).

---

## 7. Décisions du porteur (2026-11-14)
1. **Vague 2 ouverte pendant le pilote** : Bouaké, San-Pédro, Yamoussoukro.
2. **Budget** : 200 000 XOF de décembre 2026 à mars 2027.
3. **Vérification hors d'Abidjan** : membres de l'équipe issus des
   différentes villes + visites possibles de l'administration sur place.
4. **Seuil** : au moins **50 annonces vérifiées** dans une ville avant d'y
   lancer la publicité grand public.
5. **Pixels Meta et TikTok** : oui (consentement du visiteur obligatoire).
6. **Gratuité** pour tous les annonceurs, sur tout le territoire national,
   pendant les 3 mois du pilote.
7. **Pas d'agence pour l'instant** : base de communication solide préparée
   en interne ; une agence pourra la reprendre.
8. Retirer « Abidjan » écrit en dur, ou le compléter par les autres villes.
9. **(2026-11-15) Korhogo et Daloa ouvertes dès le pilote**, comme la
   vague 2 (migration `20261121120000_villes_korhogo_daloa_keyli.sql`,
   `VILLES_PILOTE`). Gratuité et seuil de 50 annonces vérifiées
   inchangés.

## 8. Encore ouvert
- Modalités de la gratuité : dates exactes, plafond d'annonces par
  annonceur, sort des annonces à la fin des 3 mois.
- Quartiers de Bouaké, San-Pédro, Yamoussoukro, Korhogo et Daloa (liste
  fermée, validée par l'équipe locale).
- TikTok : reporté (section 9) ; piste possible plus tard, une agence
  partenaire de TikTok en Afrique de l'Ouest.

## Sources
- Recensement 2021 par ville : [ONU-Habitat, programme Côte d'Ivoire](https://unhabitat.org/sites/default/files/2023/07/presentation_programme_cote_d_ivoire_fr.pdf),
  [Connexion Ivoirienne, RGPH 2021](https://connectionivoirienne.net/2022/08/03/la-repartition-de-la-population-urbaine-reste-desequilibree-en-cote-divoire-ou-tout-reste-concentre-sur-abidjan-recensement-rgph2021/)
- Déficit et programmes de logement : [Connexion Ivoirienne, 2025](https://connectionivoirienne.net/2025/10/06/acces-aux-logements-sociaux-et-economiques-le-gouvernement-a-multiplie-les-actions-pour-reduire-le-deficit/),
  [KOACI, 25 000 logements sociaux](https://www.koaci.com/article/2024/07/05/cote-divoire/politique/cote-divoire-lancement-du-projet-de-construction-de-25000-logements-sociaux-en-presence-du-premier-ministre-bruno-kone-invite-le-secteur-prive-a-reprendre-sa-place-dans-ce-projet_179227.html)
- Réseaux sociaux : [DataReportal, Digital 2025 Côte d'Ivoire](https://datareportal.com/reports/digital-2025-cote-divoire),
  [Digital Business Africa](https://www.digitalbusiness.africa/cote-divoire-le-poids-des-medias-sociaux-dans-les-usages-de-la-comm-et-de-linformation/)

## 9. Outils de suivi publicitaire — fait (2026-11-14)
- `src/lib/suivi.ts` : pixels Meta et TikTok, chargés **seulement après
  consentement** et seulement si `VITE_META_PIXEL_ID` /
  `VITE_TIKTOK_PIXEL_ID` sont renseignés (`.env`, valeurs publiques ;
  vides = ni outil ni bandeau). Aucune donnée de compte transmise.
- Événements : pages vues, `inscription` (CompleteRegistration),
  `contact_annonceur` (Contact), `publication_annonce` (SubmitApplication /
  SubmitForm). `recherche` prévu, non branché.
- `src/components/suivi/BandeauConsentement.tsx` : « Refuser » aussi
  visible qu'« Accepter » ; choix gardé dans le navigateur (version 1 :
  augmenter `VERSION` si la liste des outils change) ; lien « Cookies
  publicitaires » dans le pied de page pour changer d'avis.
- Politique de sécurité du contenu (`public/_headers`) élargie à
  connect.facebook.net, www.facebook.com, analytics.tiktok.com,
  business-api.tiktok.com. Politique de confidentialité mise à jour
  (section « Stockage dans le navigateur »).
- Vérifié dans le navigateur avec un identifiant factice : bandeau,
  refus (aucun script chargé), réouverture ; sans identifiant, rien.
- **Comptes Meta créés le 2026-11-15**, tous sous le portefeuille business
  Nguessan-IT (`business_id` 2160692204539308) :
  - ensemble de données (pixel) « Keyli », identifiant **2258767188386737**,
    sans association automatique à l'API Conversions ;
    `VITE_META_PIXEL_ID` renseigné dans `.env` ;
  - Page Facebook « Keyli » (catégorie Immobilier), identifiant
    1491820994004365 ;
  - compte publicitaire « Keyli » : fuseau Africa/Abidjan, devise **euro**
    (Meta ne propose pas le XOF ; parité fixe 1 € = 655,957 XOF, donc
    200 000 XOF ≈ 305 €). Moyen de paiement ajouté par le porteur.
- **TikTok reporté (décision du porteur du 2026-11-15)** : l'inscription
  à TikTok Ads ne propose pas la Côte d'Ivoire comme pays d'enregistrement
  de l'entreprise ; sans compte publicitaire, pas de pixel. Sa part du
  budget passe sur Meta. `VITE_TIKTOK_PIXEL_ID` reste vide : le code est
  prêt, le pixel s'activera dès qu'un identifiant sera fourni (et le
  bandeau ne cite alors TikTok que s'il est configuré).
- Reste à faire : `npm run deploy` pour que le pixel Meta soit actif en
  ligne. Application mobile : pas de pixel (SDK natifs non intégrés, à
  décider plus tard).
- Reste : attribution des inscriptions aux campagnes dans la base
  (paramètres `utm_*`), section 6.2.
