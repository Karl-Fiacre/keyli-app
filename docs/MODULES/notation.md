# MODULE : Notation

Fichiers concernés : `src/components/RatingForm.tsx`, `RatingDisplay.tsx`,
`RatingsList.tsx`. Table : `ratings_keyli`.

## Règles
- [ ] Bidirectionnelle : locataire/acheteur note le propriétaire/agence ET
      inversement — deux entrées possibles par transaction, pas une seule
- [ ] `UNIQUE(property_id, rater_id)` créée avec la table (voir
      reference/schema_cible_reference.sql) — une seule note par
      utilisateur par bien, ne pas contourner côté application
- [ ] Notes publiques par défaut — policy SELECT publique ("Lecture
      publique des notes") écrite dans la même migration que la table — ne
      pas restreindre la lecture sans décision explicite, ça casserait
      l'affichage de `rating_avg` sur les profils publics

## Calcul de la moyenne
`profiles_keyli.rating_avg` — aucun mécanisme de recalcul n'existe sur le
nouveau schéma. Choisir explicitement entre un trigger SQL (recalcul à
chaque insertion dans `ratings_keyli`) et un recalcul applicatif (voir
DATABASE_LOGIC.md) — demander avant d'implémenter, ne pas supposer que la
base le fait automatiquement.

## Affichage
- `RatingDisplay.tsx` : étoiles + moyenne, utilisé sur `PropertyDetails.tsx`
  et les dashboards (KpiCard "Note moyenne")
- `RatingsList.tsx` : liste des avis individuels avec commentaire
