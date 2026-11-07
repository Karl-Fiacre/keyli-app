# Keyli — Stack technique

Versions extraites de `package.json` réel au moment de la rédaction —
vérifier `package.json` avant d'ajouter une dépendance, ne pas assumer.

## Web / PWA
Versions de l'ancien pilote, reprises pour le nouveau projet (2026-09-28) —
une dépendance n'est installée qu'au moment où un module en a besoin.
```
React 18.3 + TypeScript 5.8 + Vite 8.3 (@vitejs/plugin-react 6)
TailwindCSS 3.4 + tailwindcss-animate (Shadcn/ui)
@supabase/supabase-js 2.57
@tanstack/react-query 5.83
react-router-dom 7.18
react-hook-form 7.61 + zod 4.6 (@hookform/resolvers 5)
Google Maps JavaScript API (chargée à la demande, sans bibliothèque npm ;
  types : @types/google.maps 3.66.7 en dépendance de développement)
cloudinary 2.7
```
Montées de version validées par le porteur le 2026-10-26 (failles signalées
par `npm audit`) : react-router-dom 7.12 → 7.18.4, zod 3.25 → 4.6.7 (API des
messages : `{ error: '…' }` remplace `errorMap` / `required_error`),
@hookform/resolvers 3.10 → 5.x. `npm audit --omit=dev` : 0 faille.
Vite 5.4 → 8.3 (failles du serveur de développement) validé le 2026-10-26 :
Node ≥ 20.19 requis ; build environ 10 fois plus rapide. Reste signalé par
`npm audit` (modéré, compilation uniquement, sans correctif publié) :
`postcss-selector-parser` via Tailwind 3.4.
⚠️ npm 10.8 échoue sur certaines montées de version (« Cannot read
properties of null (reading 'edgesOut') ») : utiliser `npx npm@11 install`.
Animations : Motion 14.6.0 (ex-Framer Motion), installé le 2026-11-07 pour
le registre cinématique (décision du porteur) — voir ANIMATIONS.md.
Pas de drag-and-drop (`@dnd-kit` non installé).

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
Cartographie  : Google Maps Platform (Maps JavaScript API) — remplace
                Mapbox, décision du porteur du 2026-10-31. Projet Google
                Cloud « Nguessan-IT » (limite de projets du compte atteinte),
                clé « Keyli – web » restreinte aux référents HTTP
                (localhost:5173, 127.0.0.1:5173, keyli.com, *.keyli.com,
                keyli-2gc.pages.dev, *.keyli-2gc.pages.dev) et à
                la seule Maps JavaScript API ; Map ID « Keyli – web »
                (repères AdvancedMarker). Clé + Map ID servis par l'Edge
                Function get-maps-config (secrets GOOGLE_MAPS_API_KEY,
                GOOGLE_MAPS_MAP_ID). Ajouter tout nouveau domaine aux
                référents de la clé.
Hébergement   : Cloudflare Pages (décision du porteur, 2026-11-01), projet
                « keyli » → https://keyli-2gc.pages.dev (domaine propre à
                venir). Déploiement : `npm run deploy` (build local puis
                wrangler pages deploy). En-têtes de sécurité : public/_headers.
Emails        : Resend comme SMTP de Supabase Auth (choix du porteur,
                2026-11-01), domaine d'envoi keyli.com à venir — voir
                docs/MODULES/emails.md
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
