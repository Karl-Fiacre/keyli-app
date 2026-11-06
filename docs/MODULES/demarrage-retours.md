# MODULE : Parcours de démarrage et retours des utilisateurs

Sprint 4 — accueil du panel pilote (semaines 20-21), livré le 2026-11-06
(branche `feature/sprint4-demarrage-retours`). Migration
`20261111120000_demarrage_retours_keyli.sql`, 16 tests pgTAP.

## Décisions du porteur (2026-11-05)
- Périmètre retenu pour le code du Sprint 4 : **parcours de démarrage** et
  **retours des utilisateurs**. Non retenus pour l'instant : page publique
  de candidature au pilote (table `inscription_pilot_keyli` prête, sans
  écran), relances automatiques par email.
- **Tarif pendant le pilote : à décider plus tard**, avant l'ouverture
  (forfait offert ou payant ; si payant, Paystack en mode réel).

## Parcours de démarrage (propriétaires et agences)
- `etapes_demarrage_keyli()` (authenticated, security definer, lit
  uniquement les données de l'appelant) : étapes **calculées par la base**
  d'après les données réelles, jamais cochées à la main :
  1. `profil` — prénom, nom, téléphone (+ nom d'agence) ;
  2. `documents` — propriétaire : extrait de naissance **et** certificat de
     résidence envoyés (en attente ou approuvés) ; agence : registre ;
  3. `verification` — badge obtenu (`profiles_keyli.verified`) ;
  4. `forfait` — abonnement en cours (`abonnement_en_cours_keyli`) ;
  5. `annonce` — au moins une annonce non archivée ;
  6. `equipe` — agence seulement : au moins un agent actif.
  Aucune ligne pour un chercheur ou un admin.
- Écran : `ParcoursDemarrage` (`src/components/dashboard/`) en tête des
  tableaux de bord propriétaire et agence : barre d'avancement, prochaine
  étape mise en avant, chaque étape mène à la bonne page. Disparaît quand
  tout est fait ; bouton « masquer » (préférence du navigateur seulement).
  Recalculé à chaque retour sur le tableau de bord.
- `onboarding_checklists_keyli` (étapes posées par l'admin) reste
  inutilisée : disponible pour un suivi manuel si besoin.

## Retours des utilisateurs (feedback_keyli)
- Tous les rôles : « Donner mon avis » dans la barre latérale → `/retours`
  (type : suggestion, problème technique, réclamation, ce que j'apprécie ;
  sujet ; message) et liste « Mes retours » avec statut et réponse.
- Base : sujet 3-120 caractères, message 10-2 000, réponse ≤ 2 000 ;
  **5 retours par 24 h au plus** par compte ; un retour arrive toujours
  « en attente » sans réponse (forcé par déclencheur).
- Back-office : onglet « Retours » (`/admin/retours`) — file par statut
  (en attente, lu, traité, classé), auteur (nom, rôle, email), réponse.
- Réponse de l'équipe : notification `retour_repondu` (cloche) **et email**
  (si l'utilisateur n'a pas coupé ses emails) ; changer seulement le
  statut ne renotifie pas.
