# MODULE : Pricing & Abonnements

Fichiers concernés : `src/pages/Subscription.tsx`, `src/hooks/useSubscription.ts`,
`src/lib/paystack.ts`, Edge Functions `handle-paystack-payment`,
`paystack-webhook`, `check-expired-subscriptions`, `send-expiration-notification`.
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
                                   personnalisée négociée avec l'admin
```

## Flux paiement
```
1. Sélection forfait → handle-paystack-payment (Edge Function)
2. payment_attempts_keyli créé (status: 'initiated')
3. Redirection Paystack → paystack-webhook confirme → transactions_keyli
   + subscriptions_keyli mis à jour (status: 'active')
4. Échec paiement → payment_attempts_keyli.error_message renseigné,
   AUCUN état incohérent en base (pas de subscription 'active' sans
   transaction confirmée correspondante)
```

## Dépassement de seuil (à construire — Edge Function check-subscription-overage)
- [ ] Détection au moment de la publication d'une annonce dépassant
      `plans_keyli.seuil_max` du forfait courant
- [ ] Si `prix_depassement_unitaire` est renseigné (Propriétaire, Grande
      Agence) → facturer au même cycle que l'abonnement
- [ ] Grande Agence au-delà de 30 : deux voies, au choix de l'agence —
      (a) 1 000 XOF par annonce supplémentaire (`prix_depassement_unitaire`),
      (b) formule personnalisée négociée avec l'admin. La formule (b) est
      propre à un abonnement, pas au forfait : à modéliser dans
      `subscriptions_keyli` (ex. montant de dépassement négocié), et
      `check-subscription-overage` ne facture pas à l'unité un abonnement
      sous formule personnalisée.
- [ ] Si `prix_depassement_unitaire` est NULL (Agence Moyenne, palier fixe
      sans dépassement à l'unité) → pas de facturation automatique, recommander
      directement la montée de gamme vers Grande Agence
- [ ] 2 mois consécutifs de dépassement → déclenche une recommandation de
      montée de gamme (notification, pas un blocage automatique), quel que
      soit le forfait

## Expiration
```
check-expired-subscriptions (cron) → détecte les abonnements arrivant à
échéance → send-expiration-notification avant expiration effective →
subscriptions_keyli.status = 'expired' si non renouvelé
```

## Règles
- [ ] Cycle mensuel uniquement — ne pas construire d'option annuelle/trimestrielle
      en v1 (décision explicite, voir PRD 11.2)
- [ ] Aucune clé secrète Paystack côté client — uniquement dans les Edge Functions
