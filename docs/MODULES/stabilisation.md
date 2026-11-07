# Module — Stabilisation du pilote (Sprint 6)

Décision du porteur (2026-11-07) : quatre chantiers pour stabiliser le
pilote d'Abidjan, avec l'objectif d'au moins 70 % de propriétaires vérifiés
(`docs/PRD_REGLES.md`) — relances automatiques, délais de la vérification,
journal des erreurs, sécurité avant ouverture.
Migration : `supabase/migrations/20261113120000_stabilisation_pilote_keyli.sql`.
Tests : `supabase/tests/stabilisation_pilote_keyli.test.sql` (15 tests).

## 1. Relances automatiques des annonceurs
- `relancer_annonceurs_keyli()` (security definer, exécutée par pg_cron
  `keyli-relances-annonceurs`, tous les jours à 9 h UTC = 9 h à Abidjan)
  relance les propriétaires et agences actifs bloqués à une étape :
  - `documents` : aucune pièce envoyée ;
  - `document_rejete` : une pièce refusée, pas encore renvoyée (prioritaire
    sur `documents`) ;
  - `annonce` : compte vérifié, aucune annonce publiée.
- Deux relances au plus par étape : palier 3 (3 jours après l'inscription
  ou le refus) et palier 7 (7 jours, et au moins 4 jours après le palier 3).
  Une seule relance par passe et par compte, jamais deux fois le même palier
  (`relances_keyli`, contrainte unique).
- La relance est une notification `relance_demarrage` : cloche (lien
  `/tableau-de-bord`) et email (« Reprendre mon démarrage ») par la chaîne
  habituelle (`docs/MODULES/emails.md`), désinscription respectée.

## 2. Délais de la vérification
- File des vérifications (`/admin/verifications`) : chaque dossier affiche
  depuis combien de temps il attend, en rouge au-delà de 48 h.
- Suivi du pilote (`/admin/pilote`) : `suivi_pilote_keyli()` renvoie en plus
  `documents_en_attente`, `documents_en_retard` (plus de 48 h),
  `delai_moyen_heures` (dossiers traités sur 30 jours) et `relances_7j`.
  Le seuil de 48 h est un repère d'affichage, pas une règle du PRD.

## 3. Journal des erreurs
- Navigateur : `src/lib/journal.ts`. Sont journalisées les erreurs des
  requêtes et actions (React Query) et les erreurs non rattrapées (scripts,
  promesses). Ne sont pas journalisées les erreurs attendues déjà expliquées
  à l'utilisateur (droits, règles métier, doublons) ni les coupures réseau.
  Pas de doublon, 10 envois au plus par page ouverte.
- Base : `journaliser_erreur_keyli(page, message, code, navigateur)`,
  visiteurs compris. Limites : 30 par heure par compte, 500 par heure pour
  l'ensemble des visiteurs. La base retire de la page les paramètres (`?`,
  `#`) et masque emails et numéros dans le message (`[email]`, `[nombre]`).
- Lecture admin : `/admin/erreurs` (`erreurs_recentes_keyli(jours)`, erreurs
  regroupées par message et page, nombre de fois, comptes touchés).
- Conservation 90 jours (`purger_erreurs_client_keyli()`, pg_cron
  `keyli-purge-erreurs`, 3 h 30 chaque nuit).

## 4. Sécurité avant ouverture
- `public/_headers` : ajout d'une `Content-Security-Policy` stricte —
  scripts du site et de Google Maps seulement, connexions vers le projet
  Supabase (https et wss) et Google, images du site, de Supabase, de
  Cloudinary et de Google, aucun plugin, aucune intégration du site dans un
  cadre, formulaires vers le site seulement. Le paiement Paystack est une
  redirection de page, non concernée.
- Testée le 2026-11-07 sur le build (politique en balise meta) : accueil,
  vidéo, recherche, création d'une carte Google Maps — aucune violation.
- **Si un nouveau service externe est ajouté** (polices, statistiques,
  autre stockage), l'ajouter à la politique, sinon il sera bloqué.

## Mise en ligne (porteur)
1. `npx supabase db push --linked` (migration ci-dessus).
2. `npx supabase functions deploy envoyer-emails` (texte de la relance).
3. `npm run deploy`, puis vérifier dans la console du navigateur qu'aucune
   ressource n'est bloquée sur l'accueil, la recherche et une annonce.
