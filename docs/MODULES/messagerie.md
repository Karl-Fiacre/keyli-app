# MODULE : Messagerie

Fichiers concernés : `src/pages/Messages.tsx` (créé le 2026-10-29),
`src/components/messagerie/` (ListeConversations, FilConversation),
`src/hooks/useMessagerie.ts`, `src/lib/messagerie.ts` ;
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

## Réalisé le 2026-10-29 (migration `20261029120000_messagerie_keyli.sql`)
- Une conversation = un bien + un interlocuteur ; RPC
  `mes_conversations_keyli()` (SECURITY INVOKER) : dernier message, non-lus,
  annonce, profil public de l'interlocuteur, la plus récente d'abord.
- **Temps réel** (décision du porteur) : `messages_keyli` dans la
  publication `supabase_realtime` ; le client s'abonne aux insertions (la
  RLS filtre ce que chacun reçoit) et actualise aussi toutes les 60 s en
  filet de sécurité.
- Pages `/messages` et `/messages/:bien/:interlocuteur` (liste + fil côte à
  côte ; l'un ou l'autre sur mobile), pastille des non-lus dans l'en-tête.

## Règles
- [x] `read` passe à `true` uniquement à l'ouverture réelle du fil par le
      destinataire, pas à l'affichage dans une liste (en base : seul le
      destinataire peut modifier `read`, testé)
- [x] Pastille « nouveaux messages » : messages `read = false` où
      l'utilisateur courant est `to_user` (en-tête ; MessagePreviewList du
      dashboard à venir)
- [ ] Notification email ou push d'un nouveau message (fournisseur d'email
      à choisir, mobile)
