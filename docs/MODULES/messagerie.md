# MODULE : Messagerie

Fichiers concernés : `src/pages/Messages.tsx`,
`src/components/dashboard/MessagePreviewList.tsx` ⚠️ à construire.
Table : `messages_keyli`.

## Règle centrale
- [x] AUCUN paywall — ni sur l'envoi, ni sur la réception, ni sur la
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

## Références (vérifié sur le nouveau schéma, 2026-10-02)
`from_user` / `to_user` référencent `auth.users(id)` ; pour afficher un nom,
joindre `profiles_keyli` sur `profiles_keyli.user_id`.

## Anti-démarchage (2026-10-02)
Premier contact uniquement au sujet d'une annonce et vers son propriétaire ;
ensuite réponse seulement à quelqu'un qui nous a déjà écrit sur ce bien
(testé). Un message ne se modifie ni ne se supprime.

## Règles
- [ ] `read` passe à `true` uniquement à l'ouverture réelle du fil par le
      destinataire, pas à l'affichage dans une liste (en base : seul le
      destinataire peut modifier `read`, testé)
- [ ] Badge "nouveau message" (MessagePreviewList) compte les messages
      `read = false` où l'utilisateur courant est `to_user`
