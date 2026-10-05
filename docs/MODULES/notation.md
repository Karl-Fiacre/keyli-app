# MODULE : Notation

Fichiers concernés : `src/components/RatingForm.tsx`, `RatingDisplay.tsx`,
`RatingsList.tsx`. Table : `ratings_keyli`.

## Règles
- [ ] Bidirectionnelle : locataire/acheteur note le propriétaire/agence ET
      inversement — deux entrées possibles par transaction, pas une seule
- [ ] `UNIQUE(property_id, rater_id)` créée avec la table (voir
      reference/schema_cible_reference.sql) — une seule note par
      utilisateur par bien, ne pas contourner côté application
- [x] Notes publiques par défaut — policy SELECT publique ("Lecture
      publique des notes") écrite dans la même migration que la table — ne
      pas restreindre la lecture sans décision explicite. `rating_avg` est
      exposé publiquement par la vue `profils_publics_keyli` (2026-10-05)

## Calcul de la moyenne
`profiles_keyli.rating_avg` est recalculé par le trigger SQL
`recalculer_note_moyenne_keyli` à chaque note ajoutée, modifiée ou retirée
(décision du 2026-10-02, testé) — aucun calcul côté application.

## Qui peut noter (décision du 2026-10-02)
Uniquement quelqu'un avec qui on a échangé au moins un message dans chaque
sens au sujet du bien — bloque les fausses notes d'inconnus. À resserrer
sur « lead conclu » quand `leads_keyli` existera.

## Affichage
- `RatingDisplay.tsx` : étoiles + moyenne, utilisé sur `PropertyDetails.tsx`
  et les dashboards (KpiCard "Note moyenne")
- `RatingsList.tsx` : liste des avis individuels avec commentaire
