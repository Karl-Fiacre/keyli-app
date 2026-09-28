# Structure Frontend — Keyli

Détail complet fichier par fichier : voir
Keyli_Repertoire_Fichiers_Sources_Definitif.docx (source de vérité). Ce
document donne la vue d'ensemble à garder en tête pendant le codage.

## Web (React + Vite) — existant, 27 pages
```
src/
├── pages/
│   ├── (public)      Index, About, Search, AISearch, MapView,
│   │                 PropertyDetails, PilotAbidjan, Support, Install
│   ├── (compte)       Auth, VerifyEmail, SignupSuccess, Profile, Settings
│   ├── (utilisateur)  UserDashboard, OwnerDashboard, AgencyDashboard ⚠️ À CRÉER,
│   │                 CreateProperty, Subscription, Messages, Notifications
│   └── (admin)        Admin, AdminDashboard, AdminAnalytics,
│                      AdminVerifications, UsersAdmin, AdminAuditLog,
│                      AdminNewsletter, MarketingTemplates, OnboardingAdmin,
│                      PilotDashboard, PilotInscriptionsAdmin
├── components/
│   ├── dashboard/     ⚠️ À CRÉER — voir KEYLI_DASHBOARD_DESIGN_SPEC.md
│   │                 (KpiCard, VerificationStepper, DonutChart, LeadPipeline,
│   │                 LeadCard, TrendBar, InsightCard, RecommendationCard,
│   │                 CompareTable, AgendaList, MessagePreviewList,
│   │                 DashboardSidebar, DashboardTopbar, Sparkline)
│   ├── ui/            Shadcn/ui — primitives génériques, ne pas dupliquer
│   └── (métier)       VerifiedBadge, RatingForm/Display/List, PropertyMap,
│                      WhatsAppWidget, IntelligentSearch, Chatbot, etc.
├── hooks/              useSubscription (⚠️ à étendre 3 forfaits), useGeolocation,
│                      useCountUp ⚠️ À CRÉER, use-mobile, use-toast
├── lib/                cloudinary.ts, paystack.ts, auditLog.ts, smartAlerts.ts
├── styles/             dashboard-animations.css ⚠️ À CRÉER
└── integrations/supabase/   client.ts, types.ts
```

## Mobile (React Native + Expo) — cible, rien construit
Modules natifs, distribution bêta et soumission stores : voir
`MODULES/mobile.md`. Ce qui suit est la structure de fichiers seulement.
```
apps/mobile/src/
├── screens/         équivalent des pages web, UI native
├── navigation/       stack + tabs
├── hooks/            PARTAGÉS avec le web (même logique, à extraire)
├── services/
│   ├── api/          appels Supabase — logique partagée avec le web
│   └── native/        caméra, biométrie, push, géolocalisation continue
├── lib/              utilitaires partagés avec le web
└── integrations/supabase/   client + types, réutilisables tels quels
```
Table de correspondance Web ↔ Mobile complète : voir répertoire de fichiers
sources, section 13.

## Règle de construction des dashboards
Ne jamais coder un dashboard (Agence/Propriétaire/Chercheur) directement en
JSX monolithique — toujours composer à partir des composants de
`src/components/dashboard/`. Référence visuelle exacte : les fichiers HTML
de prévisualisation (`keyli_dashboards_preview.html`) et
KEYLI_DASHBOARD_DESIGN_SPEC.md. Ce sont des maquettes de référence, pas du
code à copier tel quel (CSS inline dupliqué volontairement dans les
maquettes pour rester autonomes en preview).
