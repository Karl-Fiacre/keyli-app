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
| Propriétaire — dashboard | RPC `tableau_bord_proprietaire_keyli(30)` (vues, contacts, série), `mes_biens_marche_keyli()` (écart au prix du quartier), `mes_visites_a_venir_keyli()` | `idx_properties_owner`, `idx_interactions_property`, `idx_messages_destinataire_date`, `idx_visits_scheduled_by` / `idx_visits_visitor` — existants |
| Chercheur — dashboard | RPC `recommandations_keyli(10)` (via `preferences_chercheur_keyli`), `mes_alertes_keyli()`, `quartiers_tendance_keyli` (top popularité), favoris | `idx_interactions_utilisateur` — créé le 2026-10-30 ; `idx_search_alerts_user_actif`, `idx_properties_publiees_tri` — existants |
| Agence — dashboard, pipeline | RPC `tableau_bord_agence_keyli(jours)`, `pipeline_leads_keyli()`, `conseils_agence_keyli()` | `idx_properties_owner`, `idx_properties_agent`, index des leads par propriétaire — existants |
| Agence — performance équipe | RPC `performance_equipe_keyli(jours)` : agents + annonces, leads et avis par `agent_id` | `idx_leads_agent_date (agent_id, created_at)` — créé le 2026-10-31 ; `idx_properties_agent` |
| Admin — file de vérification | RPC `admin_file_verification_keyli(statut)` : `documents_keyli WHERE status = ? ORDER BY created_at` + déposant et bien | `idx_documents_status_date (status, created_at)` — créé |
| Admin — activité quotidienne (mini-graphiques) | RPC `admin_activite_quotidienne_keyli(30)` : comptages par jour (profils, vues, leads) | index existants (`idx_interactions_type_date`) ; agrégats à revoir au-delà du pilote |
| Admin — indicateurs | RPC `admin_indicateurs_keyli()` : comptages sur profils, annonces, avis, abonnements, documents, signalements, leads, interactions et transactions | index existants ; à revoir au-delà du pilote (agrégats à la volée) |
| Tracking vues (tout écran bien) | `INSERT property_interactions_keyli` (quartier, auteur et date imposés par trigger) | `idx_interactions_property`, `idx_interactions_type_date`, `idx_interactions_quartier`, `idx_interactions_session_vue` — créés |
| Agence — pipeline de leads | `leads_keyli WHERE owner_id = uid ORDER BY stage` | `idx_leads_owner_stage` — créé |
| Chercheur — ses visites (conversation) | `visits_keyli WHERE visitor_user_id = uid` | `idx_visits_visitor (visitor_user_id, scheduled_at)` — créé |
| Fiche d'annonce — avis sur l'annonceur | RPC `avis_recus_keyli(owner_id)` : `ratings_keyli WHERE rated_user_id = ?` + nom public de l'auteur | `idx_ratings_rated_user` (présent) |
| Agence/Propriétaire — visites à venir | `visits_keyli WHERE scheduled_by = uid AND scheduled_at > now()` | `idx_visits_scheduled_by` — créé |
| Chercheur — favoris | `favorites_keyli WHERE user_id = uid JOIN properties_keyli` | `(user_id)` couvert par la contrainte UNIQUE `(user_id, property_id)` — créée |
| Chercheur — alertes actives | `search_alerts_keyli WHERE user_id = uid AND actif = true` | `idx_search_alerts_user_actif (user_id, actif)` — créé |
| Formulaire de publication — compteur « x/seuil », demande d'accord de dépassement | RPC `etat_publication_keyli()` | `idx_publications_owner_periode (owner_id, published_at, unpublished_at)` — créé |
| Messagerie — badge non lus | `messages_keyli WHERE to_user = uid AND read = false` | `idx_messages_destinataire_non_lus` — créé |
| Messagerie — liste des conversations | RPC `mes_conversations_keyli()` : messages où uid est expéditeur ou destinataire, dernier par (bien, interlocuteur) | `idx_messages_expediteur_date (from_user, created_at desc)`, `idx_messages_destinataire_date (to_user, created_at desc)` — créés |
| Messagerie — fil d'une annonce | `messages_keyli WHERE property_id = ? AND uid IN (from_user, to_user) ORDER BY created_at` | `idx_messages_fil` — créé |
| Admin — file de modération | RPC `admin_file_signalements_keyli(statut)` : `reports_keyli WHERE status = ?` + annonce, annonceur, auteur | `idx_reports_status_date` — créé |
| Admin — journal d'audit | `audit_logs_keyli ORDER BY created_at DESC` (RLS : admin = ses entrées, super_admin = tout) | `idx_audit_created`, `idx_audit_admin`, `idx_audit_entity` — créés |
| Admin — retours utilisateurs | `feedback_keyli WHERE status = 'pending' ORDER BY created_at` | `idx_feedback_status_date` — créé |
| Admin — file pilote | `candidatures_pilote_keyli(statut)` : `inscription_pilot_keyli WHERE status = ?` tri priorité puis date (200 au plus), `compte_cree` par email dans `auth.users` | `idx_inscription_pilot_file` — créé |
| Admin — suivi du pilote | `suivi_pilote_keyli()` : comptages (annonceurs par étape de démarrage, candidatures, retours, visites, séjours, avis) | volumes du pilote : pas d'index dédié |
| Admin — délais de vérification | `suivi_pilote_keyli()` : `documents_keyli WHERE status = 'pending'` (âge), délai moyen `reviewed_at - created_at` sur 30 jours | volumes du pilote : pas d'index dédié |
| Relances quotidiennes | `relancer_annonceurs_keyli()` : annonceurs actifs × documents / annonces, anti-doublon par `relances_keyli` | `relances_keyli_user_id_etape_palier_key` (unique) — créé |
| Journal des erreurs — écriture | `journaliser_erreur_keyli` : comptage de la dernière heure (par compte ou visiteurs) avant insertion | `idx_erreurs_client_date` — créé ; index par compte à ajouter si le volume grossit |
| Admin — erreurs récentes | `erreurs_recentes_keyli(jours)` : `erreurs_client_keyli WHERE created_at > now() - jours` groupé par message, page, code (100 au plus) | `idx_erreurs_client_date` — créé |
| Cloche de notifications (pastille + liste) | `notifications_keyli WHERE user_id = uid [AND NOT lue] ORDER BY created_at DESC LIMIT 20` (RLS ; temps réel sur INSERT) — écran fait le 2026-10-31 | `idx_notifications_user_non_lues`, `idx_notifications_user_date` — créés |
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

### Réservations (séjours courts, 2026-11-01)
| Écran | Requête | Index |
|---|---|---|
| Fiche — calendrier | `nuits_completes_keyli(annonce, chambre, début, fin)` (≤ 400 jours) | `idx_reservations_occupation` (partiel `acceptee`) |
| Fiche — devis | `devis_sejour_keyli(...)` | idem |
| Recherche par dates | `rechercher_annonces_keyli(p_arrivee, p_depart, p_voyageurs)` | `idx_properties_sejour`, `idx_reservations_occupation`, `idx_types_chambres_property` |
| Mes séjours | `reservations_keyli` où `voyageur_id = moi`, tri arrivée | `idx_reservations_voyageur` |
| Demandes reçues | `reservations_keyli` où `owner_id = moi` | `idx_reservations_hote` |
Écritures atomiques : `demander_reservation_keyli` (réservation + message +
notification), `repondre_reservation_keyli` (verrou annonce, acceptation,
refus d'office des demandes concurrentes, notifications),
`annuler_reservation_keyli`.

### Parcours de démarrage et retours (2026-11-06)
| Écran | Requête | Index |
|---|---|---|
| Tableau de bord annonceur, parcours | `etapes_demarrage_keyli()` — existences sur documents, abonnements, annonces, agents de l'appelant | `uq_documents_keyli_en_cours`, `idx_properties_owner`, index des abonnements et agents existants |
| Donner mon avis, « Mes retours » | `feedback_keyli` filtré `user_id`, tri date | `idx_feedback_user_date` |
| Admin, retours | `feedback_keyli` filtré `status`, tri date (100 au plus) | `idx_feedback_status_date` |
| Limite 5 / 24 h (déclencheur) | comptage `user_id` + `created_at` | `idx_feedback_user_date` |

### Catalogue et carte (2026-11-04)
| Écran | Requête | Index |
|---|---|---|
| Accueil, catalogue (liste) | `rechercher_annonces_keyli` sans filtre, tri pertinence, 20 par page | idem Recherche |
| Accueil / Recherche, vue carte | `positions_annonces_keyli(ids de la page)` — 50 au plus, seulement quand la vue carte est ouverte | clé primaire `id` |

### Acceptation des CGU (2026-11-04)
| Écran | Requête | Index |
|---|---|---|
| Écran d'acceptation (`PorteCgu`) | `cgu_version` lu avec le profil déjà chargé (`useProfil`) — aucune requête en plus | clé `user_id` |
| Bouton « Continuer » | `accepter_cgu_keyli(p_version)` : mise à jour du profil de `auth.uid()` | clé `user_id` |

### Emails de notification (2026-11-02)
| Traitement | Requête | Index |
|---|---|---|
| Tâche chaque minute | existe-t-il un email `en_attente` dû ? | `idx_emails_sortants_a_envoyer` (partiel) |
| Lot à envoyer | `prendre_emails_keyli(25)` — `for update skip locked` | idem |
| Regroupement des messages | dernier email de la conversation | `idx_emails_sortants_conversation` |
Écritures atomiques : déclencheurs de mise en file (dans la transaction de
la notification ou du message), `terminer_email_keyli`.

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
  → depuis le 2026-11-01 : insère aussi les photos (1 à 10 adresses
    Cloudinary Keyli, p_photos) dans la même transaction

Photos d'une annonce (Mes annonces, fiche) — 2026-11-01
  → lecture : property_media_keyli where property_id = ? and media_type =
    'image' order by order_index — index idx_property_media_property
    (property_id, order_index) existant
  → ordre : RPC ordonner_photos_keyli (une seule écriture, photo principale
    cohérente)
  → ajout / retrait : écritures directes sous RLS ; trigger
    limites_photos_keyli (1 à 10) qui verrouille la ligne de l'annonce

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
