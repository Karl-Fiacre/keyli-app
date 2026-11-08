# Module — Fiabilisation des paiements (Sprint 9)

Décision du porteur (2026-11-08) : quatre chantiers — rattrapage
automatique, paiements refusés, onglet admin « Paiements », contrôle des
échéances. Objectif du calendrier : zéro abonnement expiré non détecté sur
2 semaines de test (`docs/calendrier.md`, Sprint 9).
Migration : `supabase/migrations/20261116120000_fiabilisation_paiements_keyli.sql`.
Tests : `supabase/tests/fiabilisation_paiements_keyli.test.sql` (25 tests,
781 au total).
Paiement de base (initialisation, webhook, confirmation idempotente) :
`docs/MODULES/pricing.md`.

## Constat de départ
- Un paiement réussi dont le webhook n'arrivait pas, et dont le client ne
  revenait pas sur Keyli, restait « initiated » sans jamais activer le
  forfait.
- Un refus de la banque ou de l'opérateur n'était ni expliqué ni signalé à
  l'annonceur ; un paiement abandonné restait « initiated » pour toujours.
- Aucune vue d'ensemble des paiements pour l'équipe.
- Bon point : une échéance oubliée par la tâche horaire ne laissait déjà
  aucune annonce visible (la visibilité compare directement la date de fin,
  `abonnement_en_cours_keyli`). Le risque portait sur les rappels et les
  notifications d'expiration.

## 1. Rattrapage automatique
- Tâche `keyli-rapprochement-paiements` (toutes les 15 min) : réveille
  l'Edge Function `rapprocher-paiements` seulement s'il y a des paiements à
  vérifier. Adresse et clé publique du projet lues dans le coffre (Vault),
  déjà posées pour les emails : rien de nouveau à saisir.
- Candidats (`prendre_paiements_a_verifier_keyli`) : « initiated » depuis
  plus de 15 min, et refus de moins de 24 h (le client peut réessayer sur la
  même page Paystack). Une vérification par paiement et par heure au plus
  (`verifications`, `derniere_verification`).
- Selon Paystack : réussi → forfait activé (même confirmation que le
  webhook) ; refusé → échec notifié ; sans issue → « abandoned » après 24 h.
  Paystack injoignable : nouvel essai au passage suivant.
- Un appel extérieur de la fonction ne peut que vérifier plus tôt un
  paiement déjà en attente ; la vérification d'un paiement précis est
  réservée aux admins.

## 2. Paiements refusés
- `echec_paiement_keyli(référence, message, motif_refus, notifier)` :
  motif de la banque ou de l'opérateur conservé ; notification et email
  `paiement_echoue` pour un vrai refus ou un montant incohérent, jamais
  pour une panne de configuration. Une seule notification par paiement.
- Sources : retour sur Keyli (`verify-paystack-payment`), webhook
  `charge.failed` (envoyé pour certains moyens de paiement), rattrapage.
- Retour sur Keyli après avoir fermé la page Paystack : « abandoned »
  aussitôt, sans notification.
- Écrans : page de retour (motif traduit) et bandeau « Votre dernier
  paiement n'a pas abouti » sur la page Abonnement (7 jours, tant qu'aucun
  autre paiement n'a été tenté) avec « Réessayer le paiement ». Motifs
  traduits dans `src/lib/paiements.ts` (Paystack les transmet en anglais) ;
  un motif inconnu reçoit un libellé général.

## 3. Onglet admin « Paiements »
`/admin/paiements` (`src/pages/admin/AdminPaiements.tsx`) :
- synthèse d'une période (30 derniers jours par défaut) : encaissé,
  réussis, échoués, abandonnés, en cours (`synthese_paiements_keyli`) ;
- contrôles de fiabilité sur 24 h (`controles_paiements_keyli`) ;
- 100 derniers paiements, filtrables par statut
  (`paiements_admin_keyli`), avec bouton « Vérifier » (vérification
  immédiate auprès de Paystack) pour un paiement en cours ou refusé.

## 4. Contrôle des échéances (surveillance)
Tâche `keyli-surveillance-paiements` (chaque heure, à :40) —
`surveiller_paiements_keyli`. Contrôles (`anomalies_paiements_keyli`),
chacun doit valoir 0 :
- forfaits échus depuis plus de 2 h encore « active » ;
- rappels J-7 et J-1 non envoyés (2 h de marge) ;
- paiements en cours depuis plus d'1 h jamais vérifiés (rattrapage en
  panne) ;
- paiements réussis sans transaction ; transactions sans abonnement ;
- exécutions de tâches planifiées `keyli-*` en échec (historique pg_cron).
Une échéance ou un rappel oublié est traité aussitôt
(`traiter_echeances_abonnements_keyli`) ; chaque anomalie est inscrite dans
le journal des erreurs (onglet admin « Erreurs », page
`/tache/surveillance-paiements`, sans donnée personnelle).

## Vérifications
- Tests pgTAP (25). Fonction `rapprocher-paiements` appelée en local : lot
  pris et compté, vérification d'un paiement précis refusée à un non-admin.
- Navigateur en local (compte de test `paiements.demo@keyli.test`, sans mot
  de passe, connexion par lien local) : bandeau de refus et bouton
  « Réessayer », onglet admin (contrôles, liste, « Vérifier »).
- Non vérifié en local : la réponse réelle de Paystack (pas de clé Paystack
  locale). À contrôler après la mise en ligne avec un paiement de test.

## Mise en ligne (ordre impératif)
1. Porteur : `npx supabase db push --linked` (la nouvelle signature
   d'`echec_paiement_keyli` doit exister avant les fonctions).
2. Déploiement des fonctions : `rapprocher-paiements`, `paystack-webhook`
   (`--no-verify-jwt`, déjà dans `supabase/config.toml`),
   `verify-paystack-payment`, `envoyer-emails`.
3. Porteur : `npm run deploy`.

## Reste à faire
- [ ] Mise en ligne (ci-dessus)
- [ ] Paiement de test refusé puis réussi en mode test Paystack, après la
      mise en ligne
- [ ] Suivre l'onglet Paiements pendant 2 semaines (objectif du calendrier)
