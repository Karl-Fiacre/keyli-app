# MODULE : Administration

## Double authentification obligatoire (2026-11-26)

Décision du porteur : les comptes `admin` et `super_admin` n'exercent leurs
pouvoirs qu'avec un second facteur (application d'authentification, TOTP).
- **Base** (la vraie protection) : migration
  `20261126120000_mfa_admin_keyli.sql` — `est_admin_keyli()` et
  `est_super_admin_keyli()` exigent `aal2` dans le jeton. Toutes les policies,
  lectures et actions d'administration passant par ces deux fonctions, un mot
  de passe volé ne suffit plus. Tests : fin de
  `supabase/tests/admin_keyli.test.sql` ; les identités simulées des autres
  tests portent `"aal": "aal2"`.
- **Site** : `/admin` (`Admin.tsx`) affiche `DoubleAuthAdmin`
  (`src/components/admin/`) tant que la session n'est pas en aal2 :
  enrôlement (QR code + clé, puis premier code) ou saisie du code à chaque
  connexion. Hooks `src/partage/hooks/useDoubleAuth.ts`, règles pures
  `src/partage/lib/doubleAuth.ts` (+ tests).
- **Supabase** : TOTP activé (`[auth.mfa.totp]` dans `config.toml` pour la
  base locale ; activé par défaut sur le projet hébergé — à vérifier dans
  Authentication → Multi-Factor si l'enrôlement est refusé).
- **Mobile** : pas d'administration sur l'application ; rien à changer.
- **Secours (téléphone perdu)** : le porteur supprime le facteur en SQL
  direct (tableau de bord Supabase → SQL), puis l'admin se réenrôle :
  `delete from auth.mfa_factors where user_id = '<uuid>';`
- **Ordre de mise en ligne** : d'abord `npm run deploy` (l'écran guide déjà
  l'admin), puis `npx supabase db push --linked`. Dans l'autre ordre, les
  admins perdraient l'accès jusqu'au déploiement du site.
- Suite prévue : console séparée sur `admin.keyli.com` derrière Cloudflare
  Access, une fois le domaine acheté (`docs/MISE_EN_PRODUCTION.md`).

Réalisé le 2026-11-01 (Sprint 3) : `src/pages/admin/` — `Admin.tsx` (onglets,
accès admin/super_admin ; lien « Admin » dans l'en-tête), `AdminIndicateurs.tsx`,
`AdminVerifications.tsx`, `AdminSignalements.tsx` ; `src/hooks/useAdmin.ts` ;
`src/components/dashboard/KpiCard.tsx` (version de base). Migration
`20261101120000_backoffice_admin_keyli.sql`. Premier super_admin : procédure
manuelle dans `SETUP.md`.

Fichiers prévus à l'origine : `Admin.tsx`, `AdminDashboard.tsx`, `AdminAnalytics.tsx`,
`AdminVerifications.tsx` (voir MODULES/verification.md), `UsersAdmin.tsx`,
`AdminAuditLog.tsx`, `AdminNewsletter.tsx`, `MarketingTemplates.tsx`,
`OnboardingAdmin.tsx`, `PilotDashboard.tsx`, `PilotInscriptionsAdmin.tsx`.
Tables : `audit_logs_keyli`, `feedback_keyli`, `reports_keyli`,
`marketing_templates_keyli`, `inscription_pilot_keyli`,
`onboarding_checklists_keyli`.

## Journal d'audit (audit_logs_keyli)
- [x] Toute action admin sensible passe par une fonction SQL
      (`admin_reviser_document_keyli`, `admin_traiter_signalement_keyli`,
      `super_admin_changer_role_keyli`, `super_admin_modifier_forfait_keyli`,
      `super_admin_formule_negociee_keyli`) qui écrit l'audit dans la même
      transaction (décision du 2026-10-02, testé)
- [x] Aucune écriture admin directe possible sur les tables sensibles
      (aucun privilège) ; journal non modifiable
- [x] Lecture : admin = ses entrées, super_admin = tout
- [x] Suspension de compte (2026-10-21) : `admin_suspendre_compte_keyli` /
      `admin_reactiver_compte_keyli` — motif obligatoire, date de fin
      facultative, connexion bloquée, annonces masquées, écritures bloquées,
      notification ; admins suspendus par le super_admin uniquement (testé)
- [x] Retrait de vérification d'un compte ou d'un bien (2026-10-21), motif
      obligatoire, document passé « rejeté », notification (testé)

## Modération (reports_keyli)
```
report_status_keyli : pending → reviewed → resolved
```
- [x] Un signalement `pending` est lisible par l'admin dès sa création
      (index `idx_reports_status_date`) ; traitement via
      `admin_traiter_signalement_keyli`
- [x] Motif en liste (décision du 2026-11-01) : `fraude`, `indisponible`,
      `informations_trompeuses`, `photos_non_conformes`, `comportement`,
      `autre` (précision obligatoire), précision ≤ 1 000 caractères ;
      bouton « Signaler cette annonce » sur la fiche
- [x] File `/admin/signalements` (RPC `admin_file_signalements_keyli`) :
      annonce, annonceur, auteur, nombre de signalements en attente sur
      l'annonce ; actions : marquer examiné, résoudre (note d'audit),
      retirer la vérification du bien, suspendre l'annonceur (motif
      obligatoire)

## Retours des utilisateurs (feedback_keyli) — 2026-11-06
- [x] Onglet « Retours » (`/admin/retours`) : file par statut, auteur,
      réponse notifiée (cloche + email). Détail :
      `docs/MODULES/demarrage-retours.md`.

## Suivi du pilote (inscription_pilot_keyli) — 2026-11-06
- [x] Onglet « Pilote » (`/admin/pilote`, `AdminPilote.tsx`) : entonnoir de
      démarrage des annonceurs et activité (`suivi_pilote_keyli`), file des
      candidatures par statut en_attente → contacte → converti | rejete
      (`candidatures_pilote_keyli`). Détail : `docs/MODULES/lancement-pilote.md`.
- [x] `priority_level_keyli` posé à la main par l'équipe (aucune règle
      automatique validée).

## Analytics (AdminAnalytics.tsx)
KPIs cibles pilote (voir PRD section 4.2, PRD_REGLES.md) : taux de
vérification ≥ 70%, note moyenne ≥ 4.0/5, 500 propriétés cible. Ne pas
inventer d'autres seuils sans les faire valider.
- [x] `/admin` (RPC `admin_indicateurs_keyli`, 2026-11-01) : les trois
      objectifs ci-dessus (taux calculé sur les annonceurs — propriétaires
      et agences ; annonces = visibles du public), files en attente, et
      activité sans seuil (comptes, abonnements en cours, inscriptions,
      vues, premiers contacts et encaissements sur 30 jours)

## Newsletter et templates marketing
`send-newsletter` (Edge Function) consomme `marketing_templates_keyli`
(type: whatsapp/facebook/instagram). Contenu des templates : à la charge de
l'équipe, pas généré automatiquement.
