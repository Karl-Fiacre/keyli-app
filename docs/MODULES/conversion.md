# Module — Optimisation de la conversion (Sprint 8)

Décision du porteur (2026-11-08) : quatre chantiers pour améliorer le
passage « vue d'une annonce → prise de contact », objectif du calendrier
+20 % par rapport au pilote (`docs/calendrier.md`, Sprint 8) — mesure de la
conversion, fiche annonce plus efficace, qualité des annonces, statistiques
annonceur.
Migration : `supabase/migrations/20261115120000_conversion_annonces_keyli.sql`
(aucune table nouvelle).
Tests : `supabase/tests/conversion_annonces_keyli.test.sql` (13 tests, 756
au total).

## Définitions (identiques partout)
- **Visiteurs** : couples distincts (session, annonce) ayant une vue sur la
  période (`property_interactions_keyli`, `view`).
- **Intentions** : couples distincts (session, annonce) ayant un clic
  « Contacter » (`click_contact`).
- **Contacts** : premier message d'un utilisateur à l'annonceur au sujet
  d'une annonce, daté sur la période (`messages_keyli`). Un chercheur compte
  une fois par annonce ; les réponses de l'annonceur ne comptent pas.
- **Taux** = contacts ÷ visiteurs (calculé à l'affichage).
- Écart avec l'indicateur « Contacts reçus » du tableau de bord (Sprint 3) :
  celui-ci compte les conversations actives sur la période, pas seulement
  les nouveaux contacts. Les deux chiffres coexistent.

## 1. Mesure de la conversion (admin)
- Onglet « Conversion » (`/admin/conversion`,
  `src/pages/admin/AdminConversion.tsx`) : période de référence (par défaut
  les 30 jours du pilote avant l'ouverture : 2026-10-08 → 2026-11-06) et
  période étudiée (par défaut les 30 derniers jours) ; taux de chacune,
  écart en %, mention « objectif atteint » à partir de +20 % ; répartition
  par commune et par type de bien.
- Base : `conversion_annonces_keyli(début, fin)` (admin, un an au plus).
- **Limite connue** : avant le 2026-11-08, aucun clic « Contacter » n'était
  enregistré (seules les vues l'étaient) ; les intentions ne valent qu'à
  partir de cette date. Visiteurs et contacts, eux, existent depuis le
  pilote : le taux de référence est donc calculable.

## 2. Fiche annonce plus efficace
- Bandeau collant sur téléphone et tablette (`BandeauContactMobile`) :
  prix et bouton « Contacter » (« Écrire à l'hôte » pour un séjour), qui
  mène au formulaire. Rendu directement dans `<body>` (la transition de page
  ne le déplace pas) ; la page réserve sa hauteur en bas (`index.css`,
  classe `avec-bandeau-contact`).
- Intentions de contact enregistrées : bouton du bandeau, « Se connecter
  pour contacter », envoi du premier message (`signalerIntentionContact`).
- Annonces similaires en bas de fiche (`AnnoncesSimilaires`, 4 au plus,
  source `recommandation`) : même nature (location, vente, séjour court) et
  même type ou même commune, classées par même quartier, même commune, même
  type, puis prix le plus proche. Seules les annonces visibles par le
  visiteur sont proposées.
- Pas de bouton d'appel ni de WhatsApp vers l'annonceur : le contact passe
  par la messagerie Keyli et le téléphone reste privé (`MODULES/messagerie.md`).

## 3. Qualité des annonces
- `src/lib/qualite.ts` : 7 critères — photos (5 ou plus, repère de
  `docs/SEED_DATA.md`), description, quartier, surface, pièces, position sur
  la carte, compte vérifié. Score = part des critères remplis ; conseils =
  critères manquants. **Repère d'affichage, pas une règle métier** : rien
  n'est bloqué ni classé avec ce score.

## 4. Statistiques annonceur
- Bloc « Performance de mes annonces » (`PerformanceAnnonces`) dans les
  tableaux de bord propriétaire (30 jours) et agence (période choisie) :
  visiteurs, contacts, taux, clics « Contacter » sans message, score de
  qualité et premier conseil.
- Base : `performance_mes_annonces_keyli(jours)` (7 à 90 jours, annonces non
  archivées de l'appelant).

## Vérifications
- Tests pgTAP (13) ; fiche annonce vérifiée dans le navigateur en local
  (téléphone 375 × 812 et ordinateur 1280 × 800) : bandeau, intentions
  enregistrées, annonces similaires dans l'ordre attendu, pied de page
  jamais caché.
- Tableaux de bord et onglet admin : vérifiés par la compilation et les
  tests de la base (pas de compte local connecté).

## Reste à faire
- [ ] Porteur : `npx supabase db push --linked`, puis `npm run deploy`
- [ ] Dans 2 à 4 semaines : relever le taux dans l'onglet Conversion et le
      comparer à la référence du pilote
- [ ] Le seuil de photos (5) et les critères de qualité sont à valider par
      le porteur
