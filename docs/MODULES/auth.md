# MODULE : Authentification

Fichiers concernés : `src/pages/Auth.tsx`, `VerifyEmail.tsx`,
`SignupSuccess.tsx`, `src/components/PasswordStrengthIndicator.tsx`,
`src/components/DevLoginPanel.tsx` (dev uniquement — ne jamais l'exposer en
production).

## Mécanisme
Supabase Auth (email + mot de passe). Pas de connexion sociale (Google)
implémentée actuellement — marquée "Should" dans le PRD (7.1), pas construite.

## Flux d'inscription
```
1. Formulaire (email, mot de passe, rôle : user | owner | agency)
2. Indicateur de robustesse du mot de passe affiché en temps réel
3. Compte créé (auth.users) → trigger on_auth_user_created_keyli →
   profiles_keyli (rôle et identité passés dans options.data du signUp :
   role_keyli, first_name, last_name, phone — voir DATABASE.md)
4. Email de vérification envoyé (Edge Function send-auth-email)
5. Redirection → SignupSuccess.tsx
6. Lien de vérification → VerifyEmail.tsx → profiles_keyli mis à jour
```

## Règles
- [x] Policies RLS de `profiles_keyli` — faites en Phase 0 (2026-09-28),
      version durcie par rapport au schéma de référence : lecture de son
      propre profil, modification limitée à prénom/nom/téléphone/photo,
      création par trigger uniquement (voir DATABASE.md)
- [ ] Email vérifié obligatoire avant toute publication d'annonce — vérifier
      côté serveur (RLS ou check applicatif), pas seulement côté UI
- [x] Le rôle choisi à l'inscription détermine `profiles_keyli.role_keyli`
      (enum `user_role_keyli`, fixé par le trigger, jamais modifiable par le
      client)
- [ ] Un compte `agency` doit être orienté vers la vérification registre de
      commerce dès l'inscription, pas seulement au moment de publier
- [x] Aucun rôle `admin` n'est attribuable depuis ce formulaire — refusé
      par le trigger d'inscription (testé). Création d'un admin : SQL direct
      uniquement pour l'instant ; un back-office dédié reste à confirmer
      avant de coder un quelconque chemin d'élévation de rôle

## Non couvert ici (à demander si besoin)
- Récupération de mot de passe (flux exact non détaillé dans ce lot)
- Connexion biométrique mobile (React Native, phase 3 du calendrier — voir
  répertoire de fichiers sources, "Sprint 13")
