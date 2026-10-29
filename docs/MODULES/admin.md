# MODULE : Administration

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

## Suivi du pilote (PilotDashboard.tsx, inscription_pilot_keyli)
- [ ] `inscription_status_keyli` : en_attente → contacte → converti | rejete
- [ ] `priority_level_keyli` sert au tri de la file de contact — pas de
      règle automatique d'attribution de priorité confirmée dans ce lot,
      probablement manuel côté admin (à vérifier)

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
