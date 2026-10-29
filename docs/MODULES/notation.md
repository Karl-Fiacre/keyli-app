# MODULE : Notation

Fichiers concernés : `src/components/RatingForm.tsx`, `RatingDisplay.tsx`,
`RatingsList.tsx`. Table : `ratings_keyli`.

## Règles
- [ ] Bidirectionnelle : locataire/acheteur note le propriétaire/agence ET
      inversement — deux entrées possibles par transaction, pas une seule
- [x] Une note par personne notée : unicité `(property_id, rater_id,
      rated_user_id)` depuis le 2026-10-05 (remplace `UNIQUE(property_id,
      rater_id)`) — un propriétaire note chacun de ses locataires successifs
- [x] Notes publiques par défaut — policy SELECT publique ("Lecture
      publique des notes") écrite dans la même migration que la table — ne
      pas restreindre la lecture sans décision explicite. `rating_avg` est
      exposé publiquement par la vue `profils_publics_keyli` (2026-10-05)

## Calcul de la moyenne
`profiles_keyli.rating_avg` est recalculé par le trigger SQL
`recalculer_note_moyenne_keyli` à chaque note ajoutée, modifiée ou retirée
(décision du 2026-10-02, testé) — aucun calcul côté application.

## Qui peut noter (décision du 2026-10-05)
Uniquement après une **visite effectuée** ou un **lead conclu** entre les
deux personnes sur ce bien, dans les deux sens (fonction
`relation_notable_keyli`, testé). Remplace la règle provisoire du
2026-10-02 (échange de messages). Le propriétaire contrôle ces statuts :
surveiller les comptes qui ne marquent jamais leurs visites effectuées.

## Réalisé le 2026-10-30
Décision du porteur : avis publics **note + commentaire** (500 caractères
max, contrainte en base), signés du nom public de l'auteur (« Prénom I. »)
et datés ; l'auteur peut modifier son avis. Note désormais obligatoire
(`rating NOT NULL`). RPC `avis_recus_keyli(user, limite)` (lecture
publique). Écrans : « Donner mon avis » dans la conversation dès qu'une
visite est effectuée ou un lead conclu (`relation_notable_keyli`),
`FormulaireAvis` (étoiles + commentaire), avis listés sur la fiche
d'annonce (`ListeAvis`, `Etoiles`).
- [ ] Signaler un avis abusif (modération admin) — à prévoir

## Affichage
- `RatingDisplay.tsx` : étoiles + moyenne, utilisé sur `PropertyDetails.tsx`
  et les dashboards (KpiCard "Note moyenne")
- `RatingsList.tsx` : liste des avis individuels avec commentaire
