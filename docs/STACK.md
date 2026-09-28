# Keyli — Stack technique

Versions extraites de `package.json` réel au moment de la rédaction —
vérifier `package.json` avant d'ajouter une dépendance, ne pas assumer.

## Web / PWA (existant)
```
React 18.3 + TypeScript 5.8 + Vite 5.4
TailwindCSS 3.4 + tailwindcss-animate (Shadcn/ui)
@supabase/supabase-js 2.57
@tanstack/react-query 5.83
react-router-dom 7.12
react-hook-form 7.61 + zod 3.25
mapbox-gl 3.17
cloudinary 2.7
```
⚠️ Pas de Framer Motion installé — voir ANIMATIONS.md avant d'utiliser des
animations de layout, stagger avancé ou drag-and-drop.

## Backend
Supabase : PostgreSQL + Auth + Row-Level Security + Edge Functions (Deno).
Projet dédié Keyli — jamais partagé avec un autre projet client Nguessan-IT
(voir CONTEXT.md règle 1).

## Mobile (cible — pas encore construit)
React Native (Expo), partage la logique métier TypeScript avec le web
(hooks, services API, types Supabase). Voir répertoire de fichiers sources
pour la structure cible détaillée.

## Intégrations tierces
```
Paiements     : Paystack
Médias        : Cloudinary (maintenu face à Firebase — voir PRD section 13.2)
Documents     : Supabase Storage (limite de taille appliquée côté serveur)
Cartographie  : Mapbox
IA            : recherche en langage naturel (Edge Function intelligent-search)
```

## Variables d'environnement (client, publiques uniquement)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Aucune clé secrète (service_role, Paystack secret, Cloudinary API secret) ne
doit apparaître côté client — elles vivent uniquement dans les Edge Functions.

## Démarrage local
```bash
npm install
npm run dev          # Vite dev server
```

## Package IDs applications mobiles (à renseigner une fois le projet Expo créé)
```
Android (Play Store) : à définir — ex. com.keyli.app
iOS (App Store)       : à définir — cohérent avec l'Android
```
Ne pas inventer d'ID définitif sans confirmation — c'est un identifiant
irréversible une fois publié sur les stores.
