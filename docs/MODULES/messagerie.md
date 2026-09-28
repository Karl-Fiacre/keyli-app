# MODULE : Messagerie

Fichiers concernés : `src/pages/Messages.tsx`,
`src/components/dashboard/MessagePreviewList.tsx` ⚠️ à construire.
Table : `messages_keyli`.

## Règle centrale
- [ ] AUCUN paywall — ni sur l'envoi, ni sur la réception, ni sur la
      consultation des coordonnées. Décision explicite (PRD 11.3) : les
      propriétaires/agences paient déjà pour être vus, faire payer la
      demande contredirait ce qu'ils achètent. Ne jamais réintroduire de
      restriction ici sans une décision produit explicite qui la remplace.

## Flux
```
1. Message initié depuis PropertyDetails.tsx (contact du propriétaire/agence)
2. messages_keyli : from_user, to_user, property_id, body, read=false
3. Widget WhatsApp (WhatsAppWidget.tsx) : canal alternatif, pas remplaçant
   de la messagerie interne
```

## ⚠️ Point à vérifier avant de coder une requête
La colonne `messages_keyli.from_user`/`to_user` référence `auth.users(id)`
dans la migration trouvée, mais le reste du schéma `_keyli` référence tantôt
`auth.users` tantôt `profiles_keyli` selon la table. Vérifier la migration
exacte de `messages_keyli` avant d'écrire une jointure — ne pas assumer.

## Règles
- [ ] `read` passe à `true` uniquement à l'ouverture réelle du fil par le
      destinataire, pas à l'affichage dans une liste
- [ ] Badge "nouveau message" (MessagePreviewList) compte les messages
      `read = false` où l'utilisateur courant est `to_user`
