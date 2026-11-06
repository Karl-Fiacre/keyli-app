# Règles métier et critères d'acceptation — Keyli

Extrait condensé du PRD (Keyli_PRD_v1.5.docx) au format checklist pour
référence rapide. En cas de divergence, le PRD fait foi — ce fichier est un
résumé, pas la source primaire.

## MODULE AUTH
- [ ] Email vérifié obligatoire avant publication d'annonce
- [ ] Indicateur de robustesse du mot de passe à l'inscription
- [ ] Rôle déterminé à l'inscription : user / owner / agency (admin = créé
      manuellement, jamais par inscription publique)

## MODULE GÉOLOCALISATION (voir MODULES/geolocalisation.md)
- [ ] Recherche par rayon = promesse produit confirmée. PostGIS activé dès
      la première migration du nouveau projet (décision actée, voir
      DATABASE.md) — `geolocation` en `geography(Point, 4326)` avec index
      GiST créé dans la même migration que `properties_keyli`
- [ ] Filtre par rayon via `ST_DWithin` uniquement, jamais sans l'index GiST
- [ ] Rayon par défaut, sélection du point et interaction avec le filtre
      quartier restent à trancher (MODULES/geolocalisation.md) — demander
      avant de coder l'interface de recherche par rayon
- [ ] Ne jamais dupliquer une colonne de coordonnées à côté de
      `geolocation`

## MODULE ANNONCES (properties_keyli)
- [x] Publication bloquée au-delà du seuil du forfait sans facturation de
      dépassement confirmée (trigger `controler_publication_keyli`, accord
      `accepte_depassement`, testé)
- [x] `is_verified = true` uniquement après validation admin des documents
      liés — jamais positionné par le propriétaire/agence lui-même (testé)
- [ ] Badge « Vérifié » affiché uniquement si `is_verified = true`

## MODULE VÉRIFICATION (documents_keyli)
- [ ] owner → document_type IN (acd, extrait_naissance, cert_residence)
- [ ] agency → document_type = registre (registre de commerce) OBLIGATOIRE
- [x] Limite de taille/format appliquée côté serveur (bucket privé, 5 Mo,
      PDF/JPEG/PNG — prouvé sur le distant le 2026-10-02)
- [x] Rejet de document → commentaire obligatoire (`review_notes`, contrainte CHECK)

## MODULE PRICING (subscriptions_keyli)
- [ ] Forfait Propriétaire : 5 000 XOF/mois, 1 à 4 annonces incluses
- [ ] Forfait Agence Moyenne : 15 000 XOF/mois, 5 à 10 annonces
- [ ] Forfait Grande Agence : 25 000 XOF/mois, 11 à 30 annonces (plafond
      fixé le 2026-10-01). Au-delà de 30 : soit 1 000 XOF par annonce
      supplémentaire, soit une formule personnalisée négociée avec le super_admin
- [ ] Prix identique à volume égal, quel que soit le type de compte affiché
      — c'est le VOLUME qui détermine le forfait, pas le rôle en soi
- [x] Compte agence (registre de commerce vérifié) ne peut PAS s'inscrire au
      forfait Propriétaire, même à faible volume — trigger
      `validate_subscription_keyli`, testé
- [x] Annonce archivée puis republiée = compte comme nouvelle annonce du
      mois (anti-contournement du seuil) — journal des mises en ligne, testé
- [x] Dépassement de seuil facturé au même cycle que l'abonnement, pas en
      facture séparée par annonce — décision du 2026-10-26 : dépassement
      MENSUEL ((mises en ligne du cycle − seuil) × prix), ajouté au prochain
      paiement du forfait ; impayé reporté sur tout paiement suivant (testé)
- [x] 2 mois consécutifs de dépassement → recommandation explicite de
      montée de gamme (pas de facturation indéfinie du dépassement) —
      notification in-app, une fois par série (testé)
- [ ] Cycle de facturation : mensuel uniquement en v1 (pas d'annuel/trimestriel)
- [x] Expiration (décision du 2026-10-25) : rappels dans l'application à
      J-7 et J-1, aucun délai de grâce ; à l'échéance, abonnement `expired`
      et annonces MASQUÉES au public (pas archivées), elles réapparaissent
      dès le renouvellement — RLS + tâche pg_cron horaire, testé
- [ ] Les 3 forfaits vivent dans la table `plans_keyli` (seuils, prix
      mensuel, prix de dépassement), référencée par
      `subscriptions_keyli.plan_id` — jamais codés en dur côté client, jamais
      recréés en enum (décision actée, voir DATABASE.md et MODULES/pricing.md)

## MODULE CHERCHEUR
- [x] AUCUN paywall sur la messagerie interne ni les coordonnées de contact
      en v1 — décision explicite (PRD 11.3), pas un oubli
- [x] Alertes de recherche sauvegardée déclenchent une notification sur
      nouvelle annonce correspondante (in-app, immédiate, 10/jour/alerte max —
      2026-10-05, testé)

## MODULE NOTATION (ratings_keyli)
- [x] Une seule note par auteur, par bien et par personne notée — contrainte
      `ratings_keyli_une_note_par_personne (property_id, rater_id,
      rated_user_id)` (2026-10-05), jamais contournée côté application
- [x] Notation seulement après une visite effectuée ou un lead conclu
      (2026-10-05, testé)
- [x] Notation bidirectionnelle : locataire note propriétaire ET inversement
      (après échange de messages dans les deux sens, testé)
- [x] Notes publiquement visibles — policy SELECT publique ("Lecture
      publique des notes") écrite dans la même migration que la table — ne
      pas restreindre par erreur

## MODULE RÉSERVATIONS (reservations_keyli — amendement du 2026-11-01)
- [x] Séjours courts uniquement (hôtel/auberge à louer : toujours ; autre
      location : case « séjour court ») — contraintes CHECK, testé
- [x] Prix, nuits et total calculés par la base (`devis_sejour_keyli`),
      jamais par l'écran — testé
- [x] Seule une réservation acceptée bloque des nuits ; acceptation sous
      verrou, jamais au-delà de la capacité ; demandes devenues impossibles
      refusées d'office — testé
- [x] Aucune écriture directe : demander / répondre / annuler par fonctions
      contrôlées ; lecture limitée au voyageur, à l'hôte et à l'admin — testé
- [x] Pas de paiement en ligne des séjours (réglés avec l'hôte)

## SPRINT 4 — DÉMARRAGE ET RETOURS (2026-11-06)
- [x] Étapes du parcours de démarrage calculées par la base, jamais
      cochées par le client — testé
- [x] Retours : longueurs bornées, 5 par jour au plus, réponse réservée à
      l'admin et notifiée à l'auteur — testé
- [ ] Tarif des annonceurs pendant le pilote : à décider avant l'ouverture

## CATALOGUE ET CARTE (2026-11-04)
- [x] La position exacte d'un bien n'est jamais lisible par le client
      (anon comme connecté) — testé
- [x] Carte publique : positions approximatives (case ≈ 450 m) calculées
      par la base, stables d'un appel à l'autre — testé

## MODULE JURIDIQUE (acceptation des CGU — 2026-11-04)
- [x] Acceptation des CGU obligatoire à l'inscription ; version et date
      enregistrées par la base, jamais écrites par le client — testé
- [x] Version périmée refusée ; nouvelle version = nouvelle acceptation à
      la prochaine connexion — testé
- [ ] Textes relus par un juriste, déclaration ARTCI faite (avant
      l'ouverture au public)

## MODULE EMAILS (emails_sortants_keyli — 2026-11-02)
- [x] Emails envoyés par le serveur uniquement (file + Edge Function) ;
      aucune écriture de la file depuis le client — testé
- [x] Préférence respectée, sauf emails de service (suspension, badge
      retiré) — testé
- [x] Messages regroupés (≤ 1 email / conversation / 15 min, seulement si
      non lus) — testé
- [x] Désinscription sans connexion par jeton personnel — testé

## MODULE ADMIN
- [x] Toute action admin sensible écrite dans `audit_logs_keyli` (fonctions
      SQL, même transaction, testé)
- [ ] File de vérification traitée avant onboarding du panel pilote
      (prérequis calendrier, voir Calendrier Définitif Phase 1)

## MODULE QUARTIERS TENDANCE (à construire — voir PRD 7.2)
- [ ] Une seule source de données pour les quartiers populaires (Accueil) ET
      le TrendBar du dashboard Chercheur — jamais deux mécanismes séparés
- [ ] Source de données : `property_interactions_keyli` (`quartier_id`
      copié au moment de l'événement, `interaction_type =
      'search_neighborhood'`) — voir MODULES/analytics-tracking.md, ne pas
      inventer un autre mécanisme de tracking
- [ ] Calcul de la tendance (ce qui compte comme recherche, fenêtre,
      fréquence de recalcul) non tranché — voir
      MODULES/quartiers-tendance.md, demander avant de coder

## SÉCURITÉ
- [ ] RLS activée sur toute nouvelle table contenant des données utilisateur,
      dans la même migration que sa création
- [ ] Aucune clé secrète (service_role, Paystack, Cloudinary) côté client
- [ ] Projet Supabase dédié Keyli, jamais partagé avec un autre projet client
