# MODULE : Quartiers tendance

⚠️ Fonctionnalité encore partiellement ouverte — enregistrée comme exigence
(PRD section 7.2 et 14) suite à la conception de la page Accueil. La
normalisation des quartiers est maintenant tranchée (Option A) ; le calcul
de tendance lui-même reste à définir.

## Ce qui est confirmé
- [x] Normalisation actée — Option A : hiérarchie fermée `communes_keyli` →
      `quartiers_keyli`, `properties_keyli.quartier_id` en FK (voir
      DATABASE.md et reference/schema_cible_reference.sql). Fini le TEXT
      libre — "Cocody" et "cocody 2 plateaux" ne peuvent plus coexister
      comme deux valeurs différentes.
- [x] Source de tracking : `property_interactions_keyli.quartier_id` (voir
      MODULES/analytics-tracking.md), copié au moment de l'événement — pas
      une jointure a posteriori vers `properties_keyli`
- [x] Une seule source de données pour deux usages : les chips "quartiers
      populaires" de l'Accueil ET le `TrendBar` du dashboard Chercheur
      ("Tendance des prix par quartier") — jamais deux mécanismes séparés
- [x] Distinction commune/quartier résolue : Cocody est une commune, Riviera
      et Angré sont des quartiers de Cocody — ne plus les traiter comme
      équivalents dans l'UI (l'Accueil et les mockups précédents les
      mélangeaient, à corriger à l'implémentation)

## Ce qui N'EST PAS tranché — demander avant de coder
- [ ] Que compte-t-on exactement comme "recherche par quartier" ? Une
      requête avec filtre quartier renseigné ? Un clic sur un chip ? Une
      visite de PropertyDetails.tsx pour un bien du quartier ? Ces trois
      définitions donnent des résultats de popularité différents.
- [ ] Affichage par commune, par quartier, ou les deux niveaux mélangés
      selon la densité de données disponibles ? (ex. si un quartier précis
      n'a pas assez d'annonces pour une tendance fiable, remonter au niveau
      commune ?) — non tranché, à décider avec des données réelles du pilote
- [ ] Fenêtre de calcul de la tendance de prix (7 jours ? 30 jours ?
      comparaison à quelle période de référence ?) — aucune valeur choisie.
- [ ] Fréquence de recalcul (temps réel ? cron quotidien comme
      `check-expired-subscriptions` ?) — aucune décision.
- [ ] Nombre de quartiers affichés sur l'Accueil (les maquettes en montrent 6,
      choix arbitraire du mockup, pas une règle produit)

## Ce qu'il ne faut PAS faire
- Ne pas inventer une formule de "score de tendance" pour combler l'absence
  de spécification — proposer une formule simple documentée ici seulement
  après validation, jamais la coder directement sans qu'elle apparaisse
  d'abord dans ce fichier.
- Ne pas construire deux implémentations séparées (une pour l'Accueil, une
  pour le dashboard Chercheur) même provisoirement — ça garantit la
  divergence future.
- Ne pas ajouter de nouveaux quartiers à la volée depuis le formulaire de
  publication d'annonce sans validation admin — la liste est fermée par
  design (Option A) ; un propriétaire qui ne trouve pas son quartier doit
  remonter une demande, pas créer silencieusement une nouvelle entrée.
