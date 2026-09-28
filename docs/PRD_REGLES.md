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
- [ ] Publication bloquée au-delà du seuil du forfait sans facturation de
      dépassement confirmée (voir MODULE PRICING)
- [ ] `is_verified = true` uniquement après validation admin des documents
      liés — jamais positionné par le propriétaire/agence lui-même
- [ ] Badge « Vérifié » affiché uniquement si `is_verified = true`

## MODULE VÉRIFICATION (documents_keyli)
- [ ] owner → document_type IN (acd, extrait_naissance, cert_residence)
- [ ] agency → document_type = registre (registre de commerce) OBLIGATOIRE
- [ ] Limite de taille/format appliquée côté serveur, pas seulement interface
- [ ] Rejet de document → commentaire obligatoire (`review_notes`)

## MODULE PRICING (subscriptions_keyli)
- [ ] Forfait Propriétaire : 5 000 XOF/mois, 1 à 4 annonces incluses
- [ ] Forfait Agence Moyenne : 15 000 XOF/mois, 5 à 10 annonces
- [ ] Forfait Grande Agence : 25 000 XOF/mois, au-delà de 10 (gros volume
      négocié sur devis, hors automatisation standard)
- [ ] Prix identique à volume égal, quel que soit le type de compte affiché
      — c'est le VOLUME qui détermine le forfait, pas le rôle en soi
- [ ] Compte agence (registre de commerce vérifié) ne peut PAS s'inscrire au
      forfait Propriétaire, même à faible volume
- [ ] Annonce archivée puis republiée = compte comme nouvelle annonce du
      mois (anti-contournement du seuil)
- [ ] Dépassement de seuil facturé au même cycle que l'abonnement, pas en
      facture séparée par annonce
- [ ] 2 mois consécutifs de dépassement → recommandation explicite de
      montée de gamme (pas de facturation indéfinie du dépassement)
- [ ] Cycle de facturation : mensuel uniquement en v1 (pas d'annuel/trimestriel)
- [ ] Les 3 forfaits vivent dans la table `plans_keyli` (seuils, prix
      mensuel, prix de dépassement), référencée par
      `subscriptions_keyli.plan_id` — jamais codés en dur côté client, jamais
      recréés en enum (décision actée, voir DATABASE.md et MODULES/pricing.md)

## MODULE CHERCHEUR
- [ ] AUCUN paywall sur la messagerie interne ni les coordonnées de contact
      en v1 — décision explicite (PRD 11.3), pas un oubli
- [ ] Alertes de recherche sauvegardée déclenchent une notification sur
      nouvelle annonce correspondante

## MODULE NOTATION (ratings_keyli)
- [ ] Une seule note par utilisateur par bien — contrainte
      `UNIQUE(property_id, rater_id)` créée avec la table (voir
      reference/schema_cible_reference.sql), jamais contournée côté application
- [ ] Notation bidirectionnelle : locataire note propriétaire ET inversement
- [ ] Notes publiquement visibles — policy SELECT publique ("Lecture
      publique des notes") écrite dans la même migration que la table — ne
      pas restreindre par erreur

## MODULE ADMIN
- [ ] Toute action admin sensible écrite dans `audit_logs_keyli`
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
