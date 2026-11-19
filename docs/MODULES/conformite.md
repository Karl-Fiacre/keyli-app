# Conformité des boutiques (Sprint 20)

Exigences de Google Play et de l'App Store pour une application dont les
utilisateurs publient du contenu (annonces, messages) et ont un compte.

## Suppression du compte

- Depuis l'application : Profil → « Supprimer mon compte » (écran
  `apps/mobile/src/screens/SupprimerCompte.tsx`), confirmation en tapant
  `SUPPRIMER`.
- Depuis le site : `/profil#suppression` (`src/components/profil/SupprimerCompte.tsx`).
- Page publique sans connexion : `/suppression-compte`
  (`src/pages/juridique/SuppressionCompte.tsx`) — c'est l'URL à déclarer
  dans « Sécurité des données » (Google Play) :
  `https://keyli-2gc.pages.dev/suppression-compte`.
- Chaîne : hook partagé `useSupprimerCompte` → fonction Edge
  `supprimer-compte` (identité tirée du jeton, confirmation vérifiée) →
  `supprimer_compte_keyli` (service_role seulement, voir `DATABASE.md`) →
  suppression des fichiers `documents_keyli/<id>/` → compte Auth
  anonymisé et banni (email anonyme, mot de passe aléatoire). Les comptes
  admin et super_admin ne peuvent pas se supprimer eux-mêmes.

## Blocage d'un utilisateur

- Table `blocages_keyli` ; la base refuse tout message entre deux comptes
  dont l'un a bloqué l'autre (policy restrictive). L'interface ne fait que
  refléter cette règle.
- Web : bouton « Bloquer / Débloquer » en tête de conversation
  (`ActionsInterlocuteur`), liste « Utilisateurs bloqués » dans le profil.
- Mobile : menu « … » de la conversation, écran « Utilisateurs bloqués »
  depuis le profil.

## Signalement

- Annonce : déjà en place sur le web ; mobile : « Signaler cette
  annonce » sur la fiche (composant `Signalement`).
- Utilisateur : `reports_keyli.reported_user_id`, possible seulement
  envers quelqu'un qui vous a écrit. Même file de modération dans le
  back-office (`admin_file_signalements_keyli`).

## Tests

`supabase/tests/conformite_stores_keyli.test.sql` (24 tests).
