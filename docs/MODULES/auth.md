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
3. Compte créé (auth.users) + trigger/insertion manuelle → profiles_keyli
4. Email de vérification envoyé (Edge Function send-auth-email)
5. Redirection → SignupSuccess.tsx
6. Lien de vérification → VerifyEmail.tsx → profiles_keyli mis à jour
```

## Règles
- [ ] ⚠️ **Première chose à faire en Sprint 1** : la policy RLS sur
      `profiles_keyli` (déjà écrite dans `reference/schema_cible_reference.sql`)
      — sans elle, aucun compte ne peut lire son propre profil, le parcours
      d'inscription entier reste bloqué avant même de commencer à le tester.
- [ ] Email vérifié obligatoire avant toute publication d'annonce — vérifier
      côté serveur (RLS ou check applicatif), pas seulement côté UI
- [ ] Le rôle choisi à l'inscription détermine `profiles_keyli.role_keyli`
      (TEXT actuellement, voir DATABASE.md pour l'écart de typage)
- [ ] Un compte `agency` doit être orienté vers la vérification registre de
      commerce dès l'inscription, pas seulement au moment de publier
- [ ] Aucun rôle `admin` ne doit être attribuable depuis ce formulaire —
      création manuelle uniquement (SQL direct ou back-office dédié, à
      confirmer lequel avant de coder un quelconque chemin d'élévation de rôle)

## Non couvert ici (à demander si besoin)
- Récupération de mot de passe (flux exact non détaillé dans ce lot)
- Connexion biométrique mobile (React Native, phase 3 du calendrier — voir
  répertoire de fichiers sources, "Sprint 13")
