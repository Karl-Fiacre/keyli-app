# SEED_DATA — Données de test — Keyli

Objectif : tester chaque écran sans attendre un vrai flux de bout en bout.
À charger sur le projet Supabase de développement — **jamais sur les
données réelles du pilote** une fois celui-ci lancé.

## Comptes utilisateurs de test
| Nom | Rôle | Détail |
|---|---|---|
| Chercheur Test 1 à 3 | `user` | Comptes standards |
| Propriétaire Test 1 | `owner` | Vérifié, 2 biens actifs (dans le seuil du forfait Propriétaire) |
| Propriétaire Test 2 | `owner` | Non vérifié (pour tester le stepper de vérification en cours) |
| Agence Test 1 | `agency` | Vérifiée (registre de commerce), forfait Agence Moyenne, 3 agents internes |
| Agence Test 2 | `agency` | Vérifiée, forfait Grande Agence, volume élevé (>10 annonces, pour tester le dépassement) |
| Admin Test | `admin` | Gère vérification et modération |

**Comment créer ces comptes** : via le flux normal d'inscription
(`MODULES/auth.md`), pas injectés directement — sinon le test ne vérifie
pas le vrai chemin (email de vérification, `signup_attempts_keyli`).

## Communes et quartiers
Charger le seed complet de `reference/schema_cible_reference.sql`
(`communes_keyli`/`quartiers_keyli`, 13 communes du Grand Abidjan). Ajouter
au moins 2 quartiers supplémentaires pour Cocody au-delà du seed de
démarrage, pour tester un cas avec plusieurs quartiers dans la même
commune au-delà du minimum.

## Agents internes de test (agency_agents_keyli)
Pour Agence Test 1 : 3 agents ("Mariam Koné", "Didier Yao", "Rita Silué" —
noms cohérents avec les maquettes déjà livrées), avec des annonces
réparties inégalement entre eux pour tester le tri du tableau "Performance
de l'équipe".

## Annonces de démonstration — au moins une par statut/cas
- Une annonce `a_louer` vérifiée, Cocody/Riviera, avec 5+ photos (pour
  tester la règle "5+ photos = 2x plus de contacts" mentionnée en insight)
- Une annonce `a_vendre` non vérifiée (document en attente)
- Une annonce proche du seuil de forfait de son propriétaire (pour tester
  l'avertissement de dépassement)
- Une annonce avec `quartier_id` dans une commune hors Cocody (pour tester
  l'affichage hors du cas le plus enrichi)
- Une annonce avec géolocalisation renseignée, pour tester la recherche par
  rayon (PostGIS) dès qu'elle est implémentée

## Interactions de test (property_interactions_keyli)
Générer un volume artificiel d'événements `view` et `search_neighborhood`
étalés sur 30 jours pour au moins 2 quartiers différents, avec des
proportions différentes — pour que le futur calcul de tendance
(`MODULES/quartiers-tendance.md`) ait quelque chose de non trivial à
distinguer. Ne pas générer un volume uniforme partout, ça ne teste rien.

## Documents et vérification
- Un document `pending` (à traiter dans AdminVerifications.tsx)
- Un document `rejected` avec `review_notes` renseigné
- Un document `approved` pour Agence Test 1 (`doc_type = 'registre'`)

## Abonnements (subscriptions_keyli / plans_keyli)
Un abonnement actif par compte owner/agency de test, chacun sur un
`plan_id` différent des 3 forfaits — pour visualiser les 3 cas dans
`Subscription.tsx` sans avoir à changer de compte pour chaque test de
palier.

## Leads, visites, favoris, alertes (tables ajoutées après rescan)
- Au moins un lead par étape du pipeline (`nouveau`, `visite_planifiee`,
  `negociation`, `conclu`) pour Agence Test 1, réparti entre les 3 agents de
  test — pour tester le rendu complet du pipeline sans colonne vide
- Au moins un lead avec `contact_user_id` NULL et `contact_nom` renseigné
  (contact hors plateforme) — pour tester ce cas moins évident
- Une visite `planifiee` future, une `effectuee` passée, une `annulee` —
  les trois statuts
- Quelques favoris pour Chercheur Test 1 (au moins 2 biens différents)
- Une alerte de recherche active pour Chercheur Test 1, avec des critères
  correspondant à au moins une annonce déjà seedée (pour vérifier que le
  matching, une fois codé, la retrouve bien)

## Ce que ce fichier ne couvre pas
- Script SQL d'insertion automatisé — à écrire au moment de l'implémentation
  du module concerné, pas à l'avance ici (risque de désynchronisation avec
  le schéma réel au moment où le module sera codé)
- Données de test pour le mobile React Native — non pertinent avant la
  Phase 3
