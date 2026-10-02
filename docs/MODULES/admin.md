# MODULE : Administration

Fichiers : `Admin.tsx`, `AdminDashboard.tsx`, `AdminAnalytics.tsx`,
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
- [ ] Suspension de compte : aucune règle produit ni fonction pour
      l'instant

## Modération (reports_keyli)
```
report_status_keyli : pending → reviewed → resolved
```
- [x] Un signalement `pending` est lisible par l'admin dès sa création
      (index `idx_reports_status_date`) ; traitement via
      `admin_traiter_signalement_keyli`

## Suivi du pilote (PilotDashboard.tsx, inscription_pilot_keyli)
- [ ] `inscription_status_keyli` : en_attente → contacte → converti | rejete
- [ ] `priority_level_keyli` sert au tri de la file de contact — pas de
      règle automatique d'attribution de priorité confirmée dans ce lot,
      probablement manuel côté admin (à vérifier)

## Analytics (AdminAnalytics.tsx)
KPIs cibles pilote (voir PRD section 4.2, PRD_REGLES.md) : taux de
vérification ≥ 70%, note moyenne ≥ 4.0/5, 500 propriétés cible. Ne pas
inventer d'autres seuils sans les faire valider.

## Newsletter et templates marketing
`send-newsletter` (Edge Function) consomme `marketing_templates_keyli`
(type: whatsapp/facebook/instagram). Contenu des templates : à la charge de
l'équipe, pas généré automatiquement.
