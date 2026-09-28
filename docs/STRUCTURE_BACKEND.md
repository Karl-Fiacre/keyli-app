# Structure Backend — Keyli (Supabase)

Pas de backend Node/Express séparé — la couche serveur est Supabase
(Postgres + RLS + Edge Functions). Détail complet des fichiers : voir
Keyli_Repertoire_Fichiers_Sources_Definitif.docx, sections 7-9.

## Couches
```
Composant/Page → Hook métier → Client Supabase → RLS (Postgres) → Edge Function (si logique serveur sensible)
```

## Arborescence réelle (existant)
```
supabase/
├── migrations/            32 fichiers SQL — voir DATABASE.md pour le schéma consolidé
└── functions/
    ├── chatbot
    ├── check-expired-subscriptions
    ├── cloudinary-signature
    ├── get-mapbox-token
    ├── handle-paystack-payment
    ├── intelligent-search
    ├── notify-admin-critical
    ├── notify-admin-pilot-inscription
    ├── paystack-webhook
    ├── send-auth-email
    ├── send-expiration-notification
    ├── send-newsletter
    ├── send-pilot-invitation
    └── validate-property-image

src/integrations/supabase/
├── client.ts     → pointe vers le projet Supabase dédié Keyli
└── types.ts      → types générés depuis le schéma réel (regénérer après
                     toute migration : `supabase gen types typescript`)
```

## Edge Functions à créer (pas encore existantes)
```
calculate-quartier-trends       → agrégation recherches/prix par quartier
                                   (voir MODULES/quartiers-tendance.md, DATABASE.md)
check-subscription-overage      → détection de dépassement de seuil de forfait,
                                   déclenche la recommandation de montée de gamme
                                   (PRD 11.2, règle 4)
```
Ne pas nommer différemment sans mettre à jour ce fichier et
STRUCTURE_FRONTEND.md en même temps — les deux doivent rester synchrones.

## Règle de sécurité obligatoire
Toute Edge Function qui touche à un paiement, une vérification, ou une donnée
personnelle doit vérifier le JWT et le rôle avant d'exécuter la logique
métier — ne jamais s'appuyer uniquement sur RLS pour une Edge Function
(RLS protège les requêtes directes du client, pas le code serveur qui
utilise potentiellement une clé service_role).
