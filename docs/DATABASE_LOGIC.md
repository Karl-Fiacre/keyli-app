# DATABASE_LOGIC — Requêtes, transactions et cohérence — Keyli

Complète `docs/DATABASE.md` (le schéma) avec la logique d'accès réelle :
quelles requêtes chaque écran exécute, quelles écritures doivent être
transactionnelles, et comment éviter les incohérences entre tables.

## Catalogue de requêtes par écran

| Écran / rôle | Requête (esquisse) | Index requis |
|---|---|---|
| Chercheur — recherche | `properties_keyli` filtré prix/type/quartier_id, `is_verified` (la RLS exclut déjà les annonces archivées) | `idx_properties_recherche (quartier_id, type, price)` — créé |
| Chercheur — recherche par rayon | `ST_DWithin(geolocation, point, rayon)` | `idx_properties_geolocation` (GiST, déjà dans le schéma de référence) |
| Propriétaire — dashboard | `properties_keyli WHERE owner_id = uid` | `idx_properties_owner` (déjà présent) |
| Agence — dashboard, pipeline | `properties_keyli` + `messages_keyli` par `agent_id` | `idx_properties_agent` (déjà présent) |
| Agence — performance équipe | `properties_keyli JOIN agency_agents_keyli ON agent_id` | à ajouter si lenteur observée : `(agent_id, created_at)` |
| Admin — file de vérification | `documents_keyli WHERE status = 'pending' ORDER BY created_at` | `(status, created_at)` |
| Tracking vues (tout écran bien) | `INSERT property_interactions_keyli` | déjà indexé (property_id, type, quartier_id) |
| Agence — pipeline de leads | `leads_keyli WHERE owner_id = uid ORDER BY stage` | `idx_leads_owner_stage` (déjà présent) |
| Agence/Propriétaire — visites à venir | `visits_keyli WHERE scheduled_by = uid AND scheduled_at > now()` | `idx_visits_scheduled_by` (déjà présent) |
| Chercheur — favoris | `favorites_keyli WHERE user_id = uid JOIN properties_keyli` | à ajouter si lenteur : `(user_id)` déjà couvert par la contrainte UNIQUE |
| Chercheur — alertes actives | `search_alerts_keyli WHERE user_id = uid AND actif = true` | à ajouter si lenteur : `(user_id, actif)` |
| Page tarifs / choix de forfait (public) | `plans_keyli WHERE actif = true ORDER BY seuil_min` (RLS filtre déjà `actif`) | aucun — 3 lignes |
| Formulaire de publication — sélecteur quartier | `quartiers_keyli JOIN communes_keyli ORDER BY commune, quartier` | `idx_quartiers_commune` (déjà présent) — liste fermée, mise en cache client raisonnable (change rarement) |

**Toute nouvelle requête ajoutée en cours de développement doit être ajoutée
à cette table le jour même**, avec son index si elle combine plus d'un
champ de filtre/tri — sinon la requête est lente en développement (peu de
données) et devient un vrai problème en production dès que le pilote
atteint son volume cible (500 biens).

## Actions sensibles = Edge Function, jamais une écriture client directe

Une écriture Postgres directe depuis le client (même protégée par RLS) ne
garantit pas qu'une entrée `audit_logs_keyli` cohérente soit écrite dans la
même transaction, et ne permet pas de recalculer un montant sensible
(dépassement de forfait, commission) sans dupliquer la logique côté client.
**Toute action sensible passe par une Edge Function** qui :
1. vérifie elle-même le rôle de l'appelant (JWT + `role_keyli`) ;
2. exécute l'action métier ;
3. écrit l'entrée `audit_logs_keyli` correspondante si applicable — dans la
   même exécution, pas en différé.

```
handle-paystack-payment (Edge Function existante)
  → vérifie l'utilisateur authentifié
  → initie le paiement, crée payment_attempts_keyli
  → ne crée PAS subscriptions_keyli directement (c'est paystack-webhook,
    déclenché par la confirmation Paystack, qui le fait — ne jamais activer
    un abonnement avant confirmation réelle du paiement)

check-subscription-overage (Edge Function à créer — voir MODULES/pricing.md)
  → déclenchée à la publication d'une annonce
  → compte les annonces actives de l'owner_id (ou de l'agence, si agent_id
    rattaché — compter TOUTE l'agence, pas un seul compte, voir
    MODULES/pricing.md et DATABASE.md décision agents internes)
  → compare à plans_keyli.seuil_max du forfait actif
  → applique prix_depassement_unitaire si dépassement et non NULL
  → écrit audit_logs_keyli si dépassement facturé

calculate-quartier-trends (Edge Function à créer — voir MODULES/quartiers-tendance.md)
  → cadence non tranchée (temps réel vs cron) — ne pas décider seul, voir
    le module correspondant
```

## Cohérence entre tables — pièges à éviter

- `properties_keyli.main_image_url` doit toujours correspondre à
  `property_media_keyli` où `order_index = 0` — ne jamais laisser les deux
  désynchronisés (mettre à jour les deux dans la même transaction si l'ordre
  des médias change).
- `profiles_keyli.rating_avg` — mécanisme de recalcul non confirmé dans
  l'ancien schéma (voir MODULES/notation.md). Sur le nouveau schéma, choisir
  explicitement entre un trigger SQL (recalcul automatique à chaque insertion
  dans `ratings_keyli`) ou un recalcul applicatif — ne pas supposer que l'un
  des deux existe sans l'avoir écrit soi-même.
- `property_interactions_keyli.quartier_id` est une COPIE au moment de
  l'événement, jamais une jointure vers `properties_keyli.quartier_id` — voir
  DATABASE.md, pour ne pas corrompre l'historique de tendance si une annonce
  change de quartier ou est supprimée.
- `subscriptions_keyli.plan_id` doit toujours pointer vers un `plans_keyli`
  actif (`actif = true`) au moment de la souscription — si un forfait est
  désactivé plus tard, les abonnements existants qui le référencent restent
  valides jusqu'à leur `end_date`, ils ne doivent pas être invalidés
  rétroactivement.
