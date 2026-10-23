# Structure Frontend — Keyli

Détail complet fichier par fichier : voir
Keyli_Repertoire_Fichiers_Sources_Definitif.docx (source de vérité). Ce
document donne la vue d'ensemble à garder en tête pendant le codage.

## Web — nouveau dépôt (état réel au 2026-10-23, Sprint 1)
```
src/
├── pages/            Accueil, Inscription, Connexion, VerifierEmail,
│                     MotDePasseOublie, NouveauMotDePasse, Profil, PageIntrouvable
├── components/
│   ├── ui/           Shadcn/ui : button, input, label, card, alert
│   ├── layout/       MiseEnPage (en-tête avec le logotype, pied de page)
│   └── (métier)      ChampFormulaire, IndicateurRobustesse, RouteProtegee,
│                     VerifiedBadge
├── hooks/            useSession (FournisseurSession), useCompte (inscription,
│                     connexion, déconnexion, renvoi, réinitialisation),
│                     useProfil (lecture + modification)
├── lib/              utils (cn), validation (schémas zod), erreurs
│                     (traduction FR des erreurs Supabase)
└── integrations/supabase/   client.ts, types.ts (généré)
```
Tailwind 3.4 + tokens de DESIGN_SYSTEM.md dans `src/index.css` /
`tailwind.config.ts` ; React Router 7, React Query 5, react-hook-form + zod.

## Web (React + Vite) — ancien pilote, 27 pages (référence)
> ⚠️ **Décision du 2026-09-28 — nouveau projet.** Le code de l'ancien pilote
> n'est PAS repris : cette arborescence décrit l'ancien pilote et sert de référence de
> nommage. Rien de ce qui est marqué « existant » n'existe dans le nouveau
> dépôt tant que ce n'est pas coché dans `etat_avancement.md`.

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
