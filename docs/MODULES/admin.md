# MODULE : Administration

Fichiers : `Admin.tsx`, `AdminDashboard.tsx`, `AdminAnalytics.tsx`,
`AdminVerifications.tsx` (voir MODULES/verification.md), `UsersAdmin.tsx`,
`AdminAuditLog.tsx`, `AdminNewsletter.tsx`, `MarketingTemplates.tsx`,
`OnboardingAdmin.tsx`, `PilotDashboard.tsx`, `PilotInscriptionsAdmin.tsx`.
Tables : `audit_logs_keyli`, `feedback_keyli`, `reports_keyli`,
`marketing_templates_keyli`, `inscription_pilot_keyli`,
`onboarding_checklists_keyli`.

## Journal d'audit (audit_logs_keyli)
- [ ] Toute action admin sensible (validation/rejet document, suspension de
      compte, modification manuelle de statut) écrite avec `admin_id`,
      `action`, `entity_type`, `entity_id`, `details` (JSONB)
- [ ] Ne jamais faire de modification admin directe en base sans passer par
      le code applicatif qui écrit l'entrée d'audit correspondante

## Modération (reports_keyli)
```
report_status_keyli : pending → reviewed → resolved
```
- [ ] Un signalement `pending` doit apparaître dans une file admin visible
      dès sa création — pas de traitement uniquement par requête manuelle

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
