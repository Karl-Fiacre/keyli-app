# Structure Backend — Keyli (Supabase)

Pas de backend Node/Express séparé — la couche serveur est Supabase
(Postgres + RLS + Edge Functions). Détail complet des fichiers : voir
Keyli_Repertoire_Fichiers_Sources_Definitif.docx, sections 7-9.

## Couches
```
Composant/Page → Hook métier → Client Supabase → RLS (Postgres) → Edge Function (si logique serveur sensible)
```

## Arborescence de l'ancien pilote (référence)
> ⚠️ **Décision du 2026-09-28 — nouveau projet.** Le code de l'ancien pilote
> n'est PAS repris : cette arborescence décrit l'ancien pilote et sert de référence de
> nommage. Rien de ce qui est marqué « existant » n'existe dans le nouveau
> dépôt tant que ce n'est pas coché dans `etat_avancement.md`.

```
supabase/
├── migrations/            32 fichiers SQL — voir DATABASE.md pour le schéma consolidé
└── functions/
    ├── chatbot
    ├── check-expired-subscriptions  (remplacée par une tâche SQL pg_cron, 2026-10-25)
    ├── cloudinary-signature
    ├── get-mapbox-token             (créée le 2026-10-27, jeton public pk.… uniquement)
    ├── handle-paystack-payment      (créée le 2026-10-23)
    ├── intelligent-search
    ├── notify-admin-critical
    ├── notify-admin-pilot-inscription
    ├── paystack-webhook             (créée le 2026-10-23, verify_jwt = false)
    ├── verify-paystack-payment      (créée le 2026-10-23)
    ├── _shared/commun.ts            (CORS, clients Supabase, appel Paystack)
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
calculate-quartier-trends       → REMPLACÉE (2026-10-06) par la fonction SQL
                                   calculer_quartiers_tendance_keyli() planifiée
                                   par pg_cron — pas d'Edge Function
check-subscription-overage      → facturation des dépassements enregistrés par le
                                   trigger controler_publication_keyli (la détection
                                   est en base depuis le 2026-10-02) et
                                   recommandation de montée de gamme (PRD 11.2, règle 4)
```
Ne pas nommer différemment sans mettre à jour ce fichier et
STRUCTURE_FRONTEND.md en même temps — les deux doivent rester synchrones.

## Règle de sécurité obligatoire
Toute Edge Function qui touche à un paiement, une vérification, ou une donnée
personnelle doit vérifier le JWT et le rôle avant d'exécuter la logique
métier — ne jamais s'appuyer uniquement sur RLS pour une Edge Function
(RLS protège les requêtes directes du client, pas le code serveur qui
utilise potentiellement une clé service_role).
