# MODULE : Annonces

Fichiers concernés : `src/pages/CreateProperty.tsx`, `Search.tsx`,
`AISearch.tsx`, `MapView.tsx`, `PropertyDetails.tsx`,
`src/components/PropertyMap.tsx`, `AdvantagesDisplay.tsx`/`AdvantagesInput.tsx`,
`VerifiedBadge.tsx`, `TrustedProperties.tsx`.
Table : `properties_keyli` + `property_media_keyli`.

## Publication (CreateProperty.tsx)
```
1. Vérifier le nombre d'annonces actives de l'utilisateur (owner_id)
2. Si >= seuil du forfait en cours → bloquer OU facturer le dépassement
   (voir MODULES/pricing.md — ne pas décider seul lequel des deux sans
   vérifier l'implémentation de check-subscription-overage)
3. Formulaire : titre, type (property_type_keyli), status (à_louer/à_vendre),
   prix, description, ville, quartier, superficie, pièces, salles de bain,
   meublé, avantages/proximités
4. Upload médias → Cloudinary (signature via Edge Function cloudinary-signature)
5. validate-property-image (Edge Function) avant publication définitive
6. is_verified reste false tant que la vérification admin n'est pas passée
```

## Recherche (Search.tsx / AISearch.tsx / MapView.tsx)
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
- [ ] `main_image_url` doit toujours correspondre à la première entrée
      `property_media_keyli` (order_index = 0) — pas une valeur indépendante
      à resynchroniser manuellement
- [ ] Suppression d'une annonce : décision de soft-delete vs hard-delete non
      tranchée dans ce lot — demander avant d'implémenter (impact sur
      l'historique des transactions/ratings liés)

## Favoris (favorites_keyli)
⚠️ Table trouvée manquante lors d'un rescan — le cœur cliquable des
maquettes (Accueil, dashboard Chercheur) n'avait aucune table.
- [ ] `UNIQUE(user_id, property_id)` — clic sur un favori déjà actif retire
      la ligne plutôt que d'en créer une seconde (toggle, pas ajout seul)
- [ ] Le clic favori déclenche aussi un événement
      `property_interactions_keyli.interaction_type = 'click_favorite'`
      (voir MODULES/analytics-tracking.md) — les deux écritures ne sont pas
      redondantes : l'une est l'état actuel (favorites_keyli), l'autre
      l'historique d'événement (property_interactions_keyli)

## Alertes de recherche sauvegardée (search_alerts_keyli)
⚠️ Également trouvée manquante — exigence Should du PRD (section 7.2).
- [ ] `criteres` en JSONB plutôt que des colonnes dédiées — les critères de
      recherche (quartier, type, prix max...) sont déjà variables côté
      formulaire de recherche, dupliquer chaque champ en colonne serait
      fragile à chaque évolution des filtres
- [ ] Mécanisme de déclenchement (nouvelle annonce correspondant aux
      critères → notification) non spécifié ici — dépend de
      `check-expired-subscriptions`-like cron ou d'un trigger à la
      publication d'annonce, à trancher au moment de l'implémentation
- [ ] `actif = false` désactive l'alerte sans la supprimer (historique
      conservé, réactivable)
