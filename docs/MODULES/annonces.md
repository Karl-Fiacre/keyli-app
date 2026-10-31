# MODULE : Annonces

Fichiers créés (2026-10-27) : `src/pages/PublierAnnonce.tsx`,
`src/pages/MesAnnonces.tsx`, `src/components/annonce/` (EtatForfait,
SelecteurAvantages, SelecteurPointGps), `src/hooks/useAnnonces.ts`,
`src/lib/publication.ts`, Edge Function `get-mapbox-token`.
Fichiers prévus à l'origine : `src/pages/CreateProperty.tsx`, `Search.tsx`,
`AISearch.tsx`, `MapView.tsx`, `PropertyDetails.tsx`,
`src/components/PropertyMap.tsx`, `AdvantagesDisplay.tsx`/`AdvantagesInput.tsx`,
`VerifiedBadge.tsx`, `TrustedProperties.tsx`.
Table : `properties_keyli` + `property_media_keyli`.

## Publication (CreateProperty.tsx)
```
1. Appeler la RPC `etat_publication_keyli()` : afficher le compteur du
   cycle et, si statut = `depassement`, demander l'accord explicite
   (prix affiché) ; si `bloquee`, proposer Grande Agence ; si
   `sans_abonnement`, rediriger vers Subscription.tsx
2. Publier avec `accepte_depassement = true` seulement après cet accord —
   le trigger en base refait le contrôle (codes KY001/KY002/KY003) ; ne
   jamais refaire le calcul côté client
3. Formulaire : titre, type (property_type_keyli), status (à_louer/à_vendre),
   prix, description, ville, quartier, superficie, pièces, salles de bain,
   meublé, avantages/proximités
4. Upload médias → Cloudinary (signature via Edge Function cloudinary-signature)
5. validate-property-image (Edge Function) avant publication définitive
6. is_verified reste false tant que la vérification admin n'est pas passée
```
Réalisé le 2026-10-27 (décisions du porteur) :
- [x] Écran `/annonces/nouvelle` : compteur du cycle et blocages
      (`etat_publication_keyli`), accord explicite du dépassement avec son
      prix mensuel, formulaire complet, publication par la RPC
      `publier_annonce_keyli` (annonce + avantages en une transaction)
- [x] Avantages/proximités en **liste fermée** (`avantages_keyli`,
      `property_avantages_keyli`)
- [x] Point GPS : carte **Mapbox** (clic ou glisser le marqueur) + « Utiliser
      ma position » ; jeton public servi par `get-mapbox-token`
      (secret `MAPBOX_PUBLIC_TOKEN`, pk.… uniquement) ; sans jeton, « ma
      position » seule
- [x] Écran `/annonces` : mes annonces (en ligne, masquée, archivée)
- [ ] Photos (Cloudinary) — **second temps**, dès que les clés sont posées
- [ ] Choix de l'agent par une agence (`agent_id`), archivage et
      republication depuis l'écran, modification d'une annonce

## Recherche (Search.tsx / AISearch.tsx / MapView.tsx)
Réalisé le 2026-10-28 (décisions du porteur) — `src/pages/Recherche.tsx`,
`src/pages/FicheAnnonce.tsx`, `src/components/annonce/` (FiltresRecherche,
CarteAnnonce, FormulaireContact), `src/hooks/useRecherche.ts`,
`src/lib/recherche.ts` :
- [x] RPC `rechercher_annonces_keyli` (SECURITY INVOKER : seules les
      annonces visibles) — filtres statut, type, commune, quartier, prix
      min/max, pièces min, meublé, avantages (tous requis) ; pagination 20
      par page (plafond 50) avec total
- [x] Tri par défaut : **vérifiées d'abord**, puis les plus récentes ; prix
      croissant/décroissant et date au choix
- [x] Filtres dans l'URL (recherche partageable, bouton retour)
- [x] Fiche `/annonce/:id` : caractéristiques, avantages, profil public de
      l'annonceur, vue enregistrée (`property_interactions_keyli`, source)
- [x] Contact par la **messagerie Keyli seule** (compte requis, gratuit) ;
      le téléphone reste privé ; WhatsApp Business plus tard
- [ ] Carte et recherche par rayon : quand le jeton Mapbox sera posé
      (rayon par défaut et combinaison avec le quartier à trancher alors)
- [ ] Recherche en langage naturel (`intelligent-search`)

- Filtres structurés : prix, type, quartier, pièces, avantages
- Recherche en langage naturel → Edge Function `intelligent-search` traduit
  en filtres structurés (ne pas dupliquer cette logique côté client)
- Carte : `mapbox-gl`, jeton récupéré via Edge Function `get-mapbox-token`
  (ne jamais exposer le token Mapbox en dur côté client)

## Section Logements de Confiance (TrustedProperties.tsx)
- [ ] Uniquement des annonces avec `is_verified = true` ET note moyenne
      propriétaire ≥ 4.0 — les deux conditions, pas l'une ou l'autre
- [ ] Badge affiché via `VerifiedBadge.tsx` — utiliser ce composant existant,
      ne pas en recréer un nouveau pour l'Accueil enrichi

## Règles
- [x] `main_image_url` = première image (plus petit `order_index`) de
      `property_media_keyli`, recalculé par le trigger
      `sync_main_image_keyli` à chaque écriture de média ; non modifiable
      par le client (testé)
- [x] Suppression d'une annonce : **jamais** — archivage via
      `properties_keyli.archived_at` (décision du 2026-10-02). Une annonce
      archivée disparaît des recherches, reste visible de son propriétaire,
      et conserve notes, messages, leads et historique de tendance. Aucune
      suppression possible côté client (testé).
- [x] Une annonce non vérifiée est publique, sans badge « Vérifié »
      (décision du 2026-10-02) ; `is_verified` n'est modifiable que par
      l'admin (testé).
- [x] Point GPS obligatoire (`geolocation NOT NULL`, décision du
      2026-10-02) — le formulaire de publication doit imposer sa saisie.
- [x] Republication d'une annonce archivée = nouvelle annonce du mois :
      chaque mise en ligne est journalisée dans `property_publications_keyli`
      (testé)

## Favoris (favorites_keyli)
⚠️ Table trouvée manquante lors d'un rescan — le cœur cliquable des
maquettes (Accueil, dashboard Chercheur) n'avait aucune table.
- [x] `UNIQUE(user_id, property_id)` — clic sur un favori déjà actif retire
      la ligne plutôt que d'en créer une seconde (toggle, pas ajout seul) —
      créé le 2026-10-03, testé
- [x] Le clic favori déclenche aussi un événement
      `property_interactions_keyli.interaction_type = 'click_favorite'`
      (voir MODULES/analytics-tracking.md) — les deux écritures ne sont pas
      redondantes : l'une est l'état actuel (favorites_keyli), l'autre
      l'historique d'événement (property_interactions_keyli) — fait le
      2026-10-30 (à l'ajout seulement)
- [x] Écrans (2026-10-30) : cœur sur les cartes de résultats et la fiche
      (`BoutonFavori`, sans compte → connexion puis retour), page
      `/favoris` (`MesFavoris.tsx`, `useFavoris.ts`) ; une annonce retirée
      depuis (archivée, masquée) reste listée « plus disponible » pour
      pouvoir l'enlever. Aucune migration : table et RLS existantes.

## Alertes de recherche sauvegardée (search_alerts_keyli)
⚠️ Également trouvée manquante — exigence Should du PRD (section 7.2).
- [ ] `criteres` en JSONB plutôt que des colonnes dédiées — les critères de
      recherche (quartier, type, prix max...) sont déjà variables côté
      formulaire de recherche, dupliquer chaque champ en colonne serait
      fragile à chaque évolution des filtres
- [x] Déclenchement : trigger à la publication / republication d'une
      annonce → notification in-app immédiate (`notifications_keyli`), au plus
      10 par alerte et par jour (décision du 2026-10-05, testé) ; email et
      push à venir
- [x] Critères : commune, quartier, type, statut, prix min/max, pièces min,
      meublé, rayon autour d'un point — clés validées en base
- [x] `actif = false` désactive l'alerte sans la supprimer (historique
      conservé, réactivable) — aucune suppression possible, testé
- [x] Écran (2026-10-31) : bouton « Créer une alerte » sur la page
      Recherche, qui enregistre les filtres en cours (`BoutonAlerte`,
      `criteresAlerte()` dans `lib/recherche.ts`) ; même alerte déjà
      enregistrée → « Alerte active » ou « Réactiver l'alerte » ; visiteur →
      connexion puis retour sur la même recherche. Les équipements et le
      rayon ne sont pas proposés par l'écran (la page Recherche n'a pas de
      recherche par rayon) ; les équipements sont signalés comme ignorés.
      Gestion dans le dashboard chercheur : « Voir » (rouvre la recherche),
      « Mettre en pause » / « Réactiver ».
