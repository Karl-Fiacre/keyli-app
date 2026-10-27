# DATABASE_LOGIC — Requêtes, transactions et cohérence — Keyli

Complète `docs/DATABASE.md` (le schéma) avec la logique d'accès réelle :
quelles requêtes chaque écran exécute, quelles écritures doivent être
transactionnelles, et comment éviter les incohérences entre tables.

## Catalogue de requêtes par écran

| Écran / rôle | Requête (esquisse) | Index requis |
|---|---|---|
| Chercheur — recherche | RPC `rechercher_annonces_keyli` : `properties_keyli` filtré statut/type/commune/quartier/prix/pièces/meublé/avantages, tri vérifiées d'abord puis date (la RLS exclut archivées et masquées) | `idx_properties_recherche (quartier_id, type, price)`, `idx_properties_publiees_tri (is_verified desc, created_at desc) WHERE archived_at IS NULL`, `idx_property_avantages_avantage` — créés |
| Chercheur — fiche d'annonce | `properties_keyli` + quartier/commune + avantages + médias, puis `profils_publics_keyli` de l'annonceur | clés primaires ; `idx_property_media_property` |
| Chercheur — recherche par rayon | `ST_DWithin(geolocation, point, rayon)` | `idx_properties_geolocation` (GiST, déjà dans le schéma de référence) |
| Propriétaire — dashboard | `properties_keyli WHERE owner_id = uid` | `idx_properties_owner` (déjà présent) |
| Agence — dashboard, pipeline | `properties_keyli` + `messages_keyli` par `agent_id` | `idx_properties_agent` (déjà présent) |
| Agence — performance équipe | `properties_keyli JOIN agency_agents_keyli ON agent_id` | à ajouter si lenteur observée : `(agent_id, created_at)` |
| Admin — file de vérification | `documents_keyli WHERE status = 'pending' ORDER BY created_at` | `idx_documents_status_date (status, created_at)` — créé |
| Tracking vues (tout écran bien) | `INSERT property_interactions_keyli` (quartier, auteur et date imposés par trigger) | `idx_interactions_property`, `idx_interactions_type_date`, `idx_interactions_quartier`, `idx_interactions_session_vue` — créés |
| Agence — pipeline de leads | `leads_keyli WHERE owner_id = uid ORDER BY stage` | `idx_leads_owner_stage` — créé |
| Agence/Propriétaire — visites à venir | `visits_keyli WHERE scheduled_by = uid AND scheduled_at > now()` | `idx_visits_scheduled_by` — créé |
| Chercheur — favoris | `favorites_keyli WHERE user_id = uid JOIN properties_keyli` | `(user_id)` couvert par la contrainte UNIQUE `(user_id, property_id)` — créée |
| Chercheur — alertes actives | `search_alerts_keyli WHERE user_id = uid AND actif = true` | `idx_search_alerts_user_actif (user_id, actif)` — créé |
| Formulaire de publication — compteur « x/seuil », demande d'accord de dépassement | RPC `etat_publication_keyli()` | `idx_publications_owner_periode (owner_id, published_at, unpublished_at)` — créé |
| Messagerie — badge non lus | `messages_keyli WHERE to_user = uid AND read = false` | `idx_messages_destinataire_non_lus` — créé |
| Messagerie — liste des conversations | RPC `mes_conversations_keyli()` : messages où uid est expéditeur ou destinataire, dernier par (bien, interlocuteur) | `idx_messages_expediteur_date (from_user, created_at desc)`, `idx_messages_destinataire_date (to_user, created_at desc)` — créés |
| Messagerie — fil d'une annonce | `messages_keyli WHERE property_id = ? AND uid IN (from_user, to_user) ORDER BY created_at` | `idx_messages_fil` — créé |
| Admin — file de modération | `reports_keyli WHERE status = 'pending' ORDER BY created_at` | `idx_reports_status_date` — créé |
| Admin — journal d'audit | `audit_logs_keyli ORDER BY created_at DESC` (RLS : admin = ses entrées, super_admin = tout) | `idx_audit_created`, `idx_audit_admin`, `idx_audit_entity` — créés |
| Admin — retours utilisateurs | `feedback_keyli WHERE status = 'pending' ORDER BY created_at` | `idx_feedback_status_date` — créé |
| Admin — file pilote | `inscription_pilot_keyli WHERE status = ? ORDER BY priority_level, created_at` | `idx_inscription_pilot_file` — créé |
| Cloche de notifications (pastille + liste) | `notifications_keyli WHERE user_id = uid [AND NOT lue] ORDER BY created_at DESC` | `idx_notifications_user_non_lues`, `idx_notifications_user_date` — créés |
| Accueil — quartiers populaires | `quartiers_populaires_keyli LIMIT 6` | `idx_quartiers_tendance_score` — créé (instantané nocturne) |
| Dashboard Chercheur — TrendBar | `tendances_prix_keyli WHERE quartier_id IN (...)` | clé primaire `(niveau, zone_id)` |
| Abonnement — abonnement en cours / dernier expiré | `subscriptions_keyli WHERE user_id = uid AND status = 'active' AND end_date > now()` ; sinon `status = 'expired' ORDER BY end_date DESC LIMIT 1` | `uq_subscriptions_keyli_un_actif (user_id) WHERE active` — créé ; peu de lignes par compte |
| Tâche horaire d'échéances (pg_cron) | `subscriptions_keyli WHERE status = 'active' AND end_date <= now() + 7 jours` | `idx_subscriptions_keyli_actifs_echeance (end_date) WHERE active` — créé |
| Abonnement — dépassements à régler | `depassements_cycle_keyli WHERE user_id = uid AND statut = 'a_payer' ORDER BY cycle_debut` | `idx_depassements_user_a_payer` — créé |
| Clôture horaire / recommandation à 2 mois | `depassements_cycle_keyli WHERE user_id = ? AND cycle_fin <= ? ORDER BY cycle_fin DESC LIMIT 2` | `idx_depassements_user_cycle (user_id, cycle_fin desc)` — créé |
| Formulaire de publication — avantages | `avantages_keyli WHERE actif ORDER BY categorie, ordre` | aucun — liste fermée (~20 lignes) |
| Recherche — filtre « avec tel avantage » (à venir) | `property_avantages_keyli WHERE avantage_id = ?` | `idx_property_avantages_avantage (avantage_id, property_id)` — créé |
| Propriétaire/Agence — mes annonces | `properties_keyli WHERE owner_id = uid ORDER BY created_at DESC` | `idx_properties_owner` (présent) |
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
handle-paystack-payment (Edge Function, créée le 2026-10-23)
  → appelle initier_paiement_keyli(plan) au nom de l'utilisateur (rôle,
    compte actif, forfait ; montant lu dans plans_keyli)
  → crée payment_attempts_keyli 'initiated', initialise Paystack
  → ne crée PAS subscriptions_keyli directement (c'est
    confirmer_paiement_keyli, appelé par paystack-webhook ou
    verify-paystack-payment après confirmation Paystack — ne jamais activer
    un abonnement avant confirmation réelle du paiement)

paystack-webhook / verify-paystack-payment (Edge Functions, 2026-10-23)
  → signature HMAC vérifiée (webhook) ou GET /transaction/verify (retour)
  → confirmer_paiement_keyli : contrôle montant/devise, renouvelle ou
    change le forfait, transaction 'completed', tentative 'success' — en
    une seule transaction SQL, idempotent

controler_publication_keyli (TRIGGER en base — remplace la détection prévue
  dans check-subscription-overage, décision du 2026-10-02, voir DATABASE.md)
  → refuse ou accepte la publication selon le forfait, fige le prix du
    dépassement dans property_publications_keyli

publier_annonce_keyli (RPC SECURITY INVOKER, 2026-10-27)
  → insère l'annonce ET ses avantages dans la même transaction, avec les
    droits de l'utilisateur : RLS de publication, trigger de forfait
    (KY001 à KY004) et compte suspendu s'appliquent ; rien n'est créé si une
    partie échoue

cloturer_cycles_keyli (fonction SQL + pg_cron, toutes les heures à hh:10 —
  décision du 2026-10-26, remplace l'Edge Function check-subscription-overage)
  → clôture chaque cycle mensuel terminé : dépassement = mises en ligne du
    cycle − seuil, × prix (négocié prioritaire), ou montant négocié
  → écrit depassements_cycle_keyli ; notifications de dépassement et de
    recommandation à 2 cycles consécutifs
  → la trace comptable est la ligne depassements_cycle_keyli + la
    transaction qui la paie (pas d'audit_logs : action système, pas admin)

calculer_quartiers_tendance_keyli (fonction SQL + pg_cron, chaque nuit à
  02:00 — décision du 2026-10-06, remplace l'Edge Function
  calculate-quartier-trends)
```

## Cohérence entre tables — pièges à éviter

- `properties_keyli.main_image_url` doit toujours correspondre à
  `property_media_keyli` où `order_index = 0` — ne jamais laisser les deux
  désynchronisés (mettre à jour les deux dans la même transaction si l'ordre
  des médias change).
- `profiles_keyli.rating_avg` — recalculé par le trigger
  `recalculer_note_moyenne_keyli` (décision du 2026-10-02) ; ne jamais le
  recalculer ailleurs.
- `property_interactions_keyli.quartier_id` est une COPIE au moment de
  l'événement, jamais une jointure vers `properties_keyli.quartier_id` — voir
  DATABASE.md, pour ne pas corrompre l'historique de tendance si une annonce
  change de quartier ou est supprimée.
- `subscriptions_keyli.plan_id` doit toujours pointer vers un `plans_keyli`
  actif (`actif = true`) au moment de la souscription — si un forfait est
  désactivé plus tard, les abonnements existants qui le référencent restent
  valides jusqu'à leur `end_date`, ils ne doivent pas être invalidés
  rétroactivement.
