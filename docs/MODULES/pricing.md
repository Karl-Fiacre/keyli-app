# MODULE : Pricing & Abonnements

Fichiers concernés : `src/pages/Abonnement.tsx`, `src/pages/RetourPaiement.tsx`,
`src/hooks/useAbonnement.ts`, Edge Functions `handle-paystack-payment`,
`verify-paystack-payment`, `paystack-webhook` (code partagé
`supabase/functions/_shared/commun.ts`) ; expiration en SQL
(`traiter_echeances_abonnements_keyli`, pg_cron).
Table : `subscriptions_keyli`, `transactions_keyli`, `payment_attempts_keyli`.

## ⚠️ DÉCISION ACTÉE — table plans_keyli (Option B)
`subscription_plan_keyli` (enum) est remplacé par la table `plans_keyli`
(seuils et prix configurables en données, pas en code) — schéma complet et
seed des 3 forfaits dans DATABASE.md, section "Tables à créer". Raison du
choix : le pricing a déjà changé plusieurs fois pendant la conception
(seuils, montants) — une table permet d'ajuster sans redéploiement, un enum
ne le permettrait pas.

`subscriptions_keyli.plan_id` référence désormais `plans_keyli(id)`, plus
d'enum `subscription_plan_keyli` dans le nouveau schéma.

## Règles de forfait (voir PRD_REGLES.md pour la liste complète)
```
Propriétaire      5 000 XOF/mois   1-4 annonces
Agence Moyenne    15 000 XOF/mois  5-10 annonces
Grande Agence     25 000 XOF/mois  11-30 annonces (plafond fixé le 2026-10-01)
                                   au-delà de 30 : 1 000 XOF/annonce OU formule
                                   personnalisée négociée avec le super_admin
```

## Flux paiement
```
1. Sélection forfait (/abonnement) → handle-paystack-payment (Edge Function)
2. payment_attempts_keyli créé (status: 'initiated') par
   initier_paiement_keyli — montant figé depuis plans_keyli
3. Redirection Paystack → paystack-webhook (signé) et/ou retour navigateur
   /abonnement/retour → verify-paystack-payment ; les deux appellent
   confirmer_paiement_keyli → transactions_keyli 'completed'
   + subscriptions_keyli 'active' (idempotent : le second appel est sans effet)
4. Échec paiement → payment_attempts_keyli 'failed' + error_message,
   AUCUN état incohérent en base (pas de subscription 'active' sans
   transaction confirmée correspondante)
```
Renouvellement du même forfait : +1 mois à partir de la fin actuelle.
Changement de forfait : immédiat, nouveau mois, sans prorata (décision du
porteur, 2026-10-23). Mode test Paystack d'abord.
- [x] Paiement d'un forfait (code + 20 tests pgTAP, 2026-10-23)
- [x] Secrets `PAYSTACK_SECRET_KEY` (clé TEST) et `KEYLI_APP_URL` posés,
      fonctions déployées, URL du webhook déclarée chez Paystack (2026-10-25)
- [x] Paiement test de bout en bout réussi le 2026-10-25 (Propriétaire,
      5 000 XOF : abonnement actif 1 mois, une seule transaction, tentative
      `success`)
- [ ] Passage en mode live (clé `sk_live_…`, URL de production)

## Dépassement de seuil
Détection et contrôle faits **en base** depuis le 2026-10-02 (trigger
`controler_publication_keyli`, voir DATABASE.md) : sans abonnement → refus
KY001 ; Agence Moyenne > 10 → refus KY002 ; dépassement facturable → accord
explicite requis (KY003), prix figé dans `property_publications_keyli`.
Facturation et recommandation **en base** depuis le 2026-10-26 (migration
`20261026120000_facturation_depassements_keyli.sql`, remplace l'Edge
Function `check-subscription-overage`) :
```
Cycle = mois successifs depuis subscriptions_keyli.start_date (un
renouvellement prolonge l'abonnement, le seuil reste MENSUEL).
cloturer_cycles_keyli() — pg_cron toutes les heures (hh:10) :
  → pour chaque cycle terminé : (mises en ligne du cycle − seuil) × prix
    (négocié prioritaire) ; Grande Agence à montant négocié : ce montant,
    seulement si le cycle a dépassé 30
  → depassements_cycle_keyli (statut neant / a_payer / paye) +
    notification « depassement_cycle » si un montant est dû
  → 2e cycle d'affilée en dépassement (Agence Moyenne : au seuil de 10),
    sans formule négociée → notification « recommandation_forfait »
    (forfait supérieur, ou formule personnalisée au-delà de Grande Agence)
Paiement : initier_paiement_keyli ajoute TOUS les dépassements impayés au
prix du forfait (un seul paiement Paystack) ; confirmer_paiement_keyli les
marque payés. Un impayé reste dû et s'ajoute à tout paiement suivant.
```
- [x] Détection au moment de la publication d'une annonce dépassant
      `plans_keyli.seuil_max` du cycle en cours (trigger, testé)
- [x] Dépassement mensuel facturé avec le paiement suivant du forfait
      (Propriétaire 1 500 XOF, Grande Agence 1 000 XOF ou prix négocié)
- [x] Grande Agence au-delà de 30 : (a) 1 000 XOF par annonce et par mois,
      ou (b) formule personnalisée (`prix_depassement_negocie` et/ou
      `montant_depassement_negocie`, dû si le cycle dépasse 30)
- [x] Agence Moyenne : pas de facturation à l'unité (KY002), recommandation
      de Grande Agence quand le seuil est atteint 2 mois d'affilée
- [x] 2 mois consécutifs de dépassement → recommandation (notification,
      pas un blocage), une fois par série
- [x] Écran Abonnement : dépassements à régler et montant total à payer
- [ ] Limite connue : un paiement Paystack terminé plus de 2 h après son
      lancement, alors qu'un autre paiement a repris les mêmes dépassements,
      les ferait payer deux fois (cas rare, à rembourser manuellement)

## Expiration
```
traiter_echeances_abonnements_keyli() — fonction SQL, pg_cron toutes les
heures (job keyli-echeances-abonnements, à hh:05) — remplace les Edge
Functions check-expired-subscriptions / send-expiration-notification
(décision du 2026-10-25) :
  → J-7 puis J-1 : notification in-app « abonnement_rappel » (une fois par
    échéance ; un renouvellement déplace end_date et réarme les rappels)
  → échéance passée : status = 'expired' + notification « abonnement_expire »
Masquage des annonces : policy de lecture publique de properties_keyli
(abonnement_en_cours_keyli(owner_id)) — exact à la seconde, sans attendre
la tâche ; pas de délai de grâce ; réapparition au renouvellement.
```
- [x] Rappels J-7 / J-1, expiration, masquage — migration
      `20261025120000_expiration_abonnements_keyli.sql`, 18 tests pgTAP
- [x] Écran Abonnement : bandeau « forfait expiré, annonces masquées »
- [ ] Rappels par email (Edge Function) une fois le fournisseur choisi

## Règles
- [ ] Cycle mensuel uniquement — ne pas construire d'option annuelle/trimestrielle
      en v1 (décision explicite, voir PRD 11.2)
- [ ] Aucune clé secrète Paystack côté client — uniquement dans les Edge Functions
