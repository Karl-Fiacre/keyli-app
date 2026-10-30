# Keyli — Spécification de design des dashboards (pour implémentation par Claude Code)

## Objectif de ce document

Ce document sert de référence unique pour reproduire fidèlement dans le codebase React/TypeScript/Tailwind/Shadcn les trois dashboards prototypés en HTML statique :

- `keyli_dashboard_agence_v2.html`
- `keyli_dashboard_proprietaire_v2.html`
- `keyli_dashboard_chercheur_v2.html`

**Ces trois fichiers HTML sont la source de vérité visuelle.** Ce document décrit comment les traduire en composants React réutilisables plutôt que de dupliquer le CSS trois fois dans le vrai codebase.

Pages concernées dans le dépôt existant : `OwnerDashboard.tsx` (propriétaire), une nouvelle page `AgencyDashboard.tsx` (agence — n'existe pas encore, à créer), `UserDashboard.tsx` (chercheur).

---

## 1. Tokens de design — à vérifier/compléter dans `src/index.css`

Les tokens suivants existent déjà et doivent être réutilisés tels quels : `--primary`, `--success`, `--secondary`, `--muted-foreground`, `--border`, `--radius`, `--shadow-card`.

Tokens introduits par les mockups, à ajouter s'ils n'existent pas déjà (vérifier qu'ils ne dupliquent pas une couleur de chart existante) :

```css
--primary-glow: 218 47% 25%;   /* variante claire du bleu nuit, utilisée en accent de lien/texte */
--pending: 25 95% 53%;         /* statut "en attente/en revue" — vérifier si identique à --chart-4 existant */
--purple: 262 83% 58%;         /* tag "Leads" et badge "Insight IA" */
```

Ne pas créer de nouvelles couleurs si un token équivalent existe déjà dans la config Tailwind — préférer la réutilisation.

---

## 2. Composants partagés à créer (`src/components/dashboard/`)

| Composant | Rôle | Utilisé par |
|---|---|---|
| `DashboardSidebar.tsx` | Nav latérale fixe, item actif surligné, badge de compteur optionnel | Les 3 dashboards (contenu des items varie par rôle) |
| `DashboardTopbar.tsx` | Barre sticky : recherche optionnelle, icône notifications (avec pastille), avatar + nom/rôle | Les 3 dashboards |
| `KpiCard.tsx` | Carte avec label, valeur, badge de variation (▲/▼ coloré), sparkline SVG optionnelle | Agence, Propriétaire |
| `Sparkline.tsx` | Mini-graphique en ligne SVG, prend un tableau de points en prop | KpiCard |
| `DonutChart.tsx` | Anneau CSS `conic-gradient` + légende, prend une liste `{label, value, color}` | Agence (statut annonces) |
| `LeadPipeline.tsx` + `LeadCard.tsx` | Colonnes kanban (Nouveau/Visite/Négociation/Conclu) | Agence |
| `VerificationStepper.tsx` | Étapes horizontales avec état (fait / en cours / à faire) | Propriétaire |
| `TrendBar.tsx` | Ligne label + barre de progression + pourcentage | Propriétaire (comparaison prix), Chercheur (tendance quartier) |
| `InsightCard.tsx` | Carte à bordure gauche colorée selon type (warn/ok/neutre) + CTA | Agence |
| `RecommendationCard.tsx` | Carte carrousel avec chip de confiance et score de pertinence | Chercheur |
| `CompareTable.tsx` | Tableau de comparaison de biens, colonnes dynamiques | Chercheur |
| `AgendaList.tsx` | Liste de rendez-vous avec pastille date | Agence, Propriétaire |
| `MessagePreviewList.tsx` | Liste de messages avec avatar, aperçu, badge "nouveau" | Propriétaire, Chercheur |

Chaque composant doit accepter des données réelles via props (aucune donnée en dur) — les valeurs visibles dans les HTML (ex. "34 annonces actives", "Élise Kouamé") sont des exemples, pas des valeurs à coder en dur.

---

## 3. Structure par dashboard

### 3.1 Dashboard Agence (`AgencyDashboard.tsx` — à créer)
- Sidebar : Vue d'ensemble, Annonces, Leads (badge count), Analytics, Équipe, Facturation, Paramètres
- En-tête : salutation + sélecteur de période (7j/30j/90j)
- 4 `KpiCard` : Annonces actives, Vues 30j, Leads actifs, Note moyenne
- `LeadPipeline` (4 colonnes) + `DonutChart` (statut des annonces) côte à côte
- 3 `InsightCard` (prix à ajuster / opportunité / bonne pratique)
- Tableau performance équipe (agent, annonces, barre de conversion, note)
- `AgendaList` des visites à venir

### 3.2 Dashboard Propriétaire (`OwnerDashboard.tsx` — existant, à enrichir)
- Sidebar allégée : Vue d'ensemble, Mes biens, Messages (badge), Visites, Abonnement
- 3 `KpiCard` simples (mes annonces, vues, contacts)
- Bandeau "Estimation IA" (gradient bleu nuit) avec suggestion de prix
- `VerificationStepper` (Identité → Document → Validation → Vérifié)
- `MessagePreviewList`
- Liste de biens avec `TrendBar` comparant prix propriétaire vs moyenne quartier
- `AgendaList` des visites

### 3.3 Dashboard Chercheur (`UserDashboard.tsx` — existant, à enrichir)
- Sidebar : Recherche, Favoris, Alertes (badge), Messages (badge), Visites, Comparateur
- Carrousel horizontal de `RecommendationCard` ("Pour vous")
- `CompareTable` (comparateur de biens sélectionnés)
- `TrendBar` par quartier (tendance des prix)
- Liste d'alertes actives avec compteur de nouveautés
- `MessagePreviewList`

---

## 4. Notes d'implémentation

- Les icônes des mockups sont en SVG inline (traits, pas de remplissage) — dans le vrai codebase, utiliser la bibliothèque d'icônes déjà en place plutôt que de réinventer des SVG.
- Le donut chart et les sparklines sont volontairement en CSS/SVG pur (pas de librairie de charts) dans le prototype — évaluer si une lib déjà utilisée ailleurs dans le projet (ex. Recharts) serait plus cohérente à long terme, notamment si des graphiques plus complexes sont prévus dans `AdminAnalytics.tsx`.
- Cohérence mobile : ces layouts sidebar+topbar sont pensés Web. Pour le futur React Native (voir PRD section 9.3 et le répertoire de fichiers sources), la logique de données (props, formatage, calculs de tendance) doit être extraite dans des hooks partageables — la mise en page (sidebar fixe) ne sera pas réutilisée telle quelle sur mobile, qui utilisera une navigation par onglets/bottom bar.
- Toutes les valeurs chiffrées des mockups sont fictives, à des fins de démonstration visuelle uniquement.

---

## 5. Animations et transitions

### 5.1 Constat sur les dépendances actuelles

Le projet a déjà `tailwindcss-animate` installé (utilisé par Shadcn pour les dialogs/accordions). **Il n'a pas Framer Motion.** C'est un point à trancher avant d'implémenter, pas à décider silencieusement pendant le code :

| Besoin | Faisable avec `tailwindcss-animate` seul | Nécessite une dépendance en plus |
|---|---|---|
| Hover, focus, transitions d'état simples | Oui | — |
| Apparition/disparition de dropdown, dialog, tooltip | Oui (déjà utilisé dans le projet) | — |
| Listes qui apparaissent en cascade (stagger) | Difficile, verbeux en CSS pur | Framer Motion recommandé |
| Compteur de valeur qui s'incrémente (KPI 0 → 34) | Non | Framer Motion ou hook custom (`useCountUp`) |
| Glisser-déposer des cartes du pipeline de leads | Non | `@dnd-kit/core` recommandé |
| Animation de layout (une carte qui change de colonne en douceur) | Non | Framer Motion (`layout` prop) |

**Décision du porteur (2026-10-30)** : ni Framer Motion ni `@dnd-kit` — compteur par le hook `useCountUp`, cascades en CSS (`dashboard-animations.css`), étape d'un lead changée par un menu sur la carte. Analyse d'origine conservée ci-dessous.

**Recommandation** : ajouter Framer Motion si les animations de cascade/compteur sont jugées prioritaires pour la compétitivité visuelle voulue ; sinon rester sur `tailwindcss-animate` et accepter des transitions plus simples (fade/slide sans stagger ni compteur). `@dnd-kit/core` n'est nécessaire que si le pipeline de leads doit être réellement glissable — sinon un simple changement de statut via menu suffit fonctionnellement et évite la dépendance.

### 5.2 Principes généraux

- Durée courte pour le micro (hover, focus, badges) : **150-200ms**.
- Durée moyenne pour l'apparition de blocs (cartes, panneaux) : **250-350ms**, easing `ease-out` en entrée, `ease-in` en sortie.
- Aucune animation ne doit dépasser **500ms** — au-delà, la plateforme paraît lente, pas premium. Seule exception : le compteur de valeur `KpiCard` (600ms, voir 5.3).
- Respecter `prefers-reduced-motion : reduce` : désactiver le stagger, le compteur animé et tout mouvement non essentiel, garder uniquement des fondus discrets.
- Une seule animation d'entrée par écran au chargement (pas de cascade sur chaque interaction ensuite) — l'objectif est un effet "premier chargement soigné", pas un site qui bouge en permanence.

### 5.3 Spécification par composant

| Composant | Interaction | Effet |
|---|---|---|
| `DashboardSidebar` — item de nav | Hover | Fond `--secondary` en fondu, 150ms |
| `DashboardSidebar` — item actif | Changement de route | Fond qui glisse verticalement vers le nouvel item actif (indicateur, pas le texte) |
| `DashboardTopbar` — cloche notification | Nouvelle notification reçue | Icône : une seule oscillation courte (±8°, 400ms), puis pastille rouge qui apparaît en `scale` 0→1 |
| `DashboardTopbar` — menu profil | Ouverture | Dropdown : fondu + léger `translateY(-4px → 0)`, 200ms |
| `KpiCard` | Chargement initial de la page | Cartes en cascade : fondu + `translateY(8px → 0)`, décalage de 60ms entre chaque carte |
| `KpiCard` — valeur | Chargement initial | Compteur de 0 à la valeur finale, 600ms `ease-out` (nécessite Framer Motion ou hook custom, voir 5.1) |
| `Sparkline` | Chargement initial | Tracé de la ligne du début à la fin via `stroke-dasharray`/`stroke-dashoffset`, 500ms |
| `DonutChart` | Chargement initial | Fondu + `scale(0.9 → 1)`, 300ms — éviter l'animation de "balayage" du cercle, peu fiable en CSS pur et peu lisible |
| `LeadCard` (pipeline) | Hover | Léger soulèvement : `translateY(-2px)` + ombre plus marquée, 150ms |
| `LeadCard` (pipeline) | Changement de colonne | Si drag-and-drop implémenté : la carte suit le curseur, les autres cartes de la colonne se décalent en douceur (`layout` Framer Motion) |
| `VerificationStepper` | Passage d'une étape à l'état "fait" | Le cercle se remplit (`scale` 0.8→1 + couleur), puis la ligne de connexion suivante se dessine de gauche à droite, 300ms, l'un après l'autre |
| `InsightCard` | Apparition (nouvel insight) | Fondu + `translateX(-8px → 0)`, 250ms |
| `RecommendationCard` (carrousel) | Défilement horizontal | `scroll-snap` natif, pas d'animation JS nécessaire |
| `RecommendationCard` | Hover | `scale(1.02)` + ombre, 150ms |
| `TrendBar` | Chargement initial | La barre grandit de 0% à sa valeur finale, `ease-out`, 400ms, décalage de 80ms entre chaque ligne |
| Badges "nouveau" (messages, alertes) | Apparition | `scale(0.8 → 1)` + fondu, 200ms, léger rebond (`ease-out-back`) |
| Boutons primaires | Clic | `scale(0.97)` pendant l'appui, retour à 1 au relâchement |
| Changement d'onglet de période (7j/30j/90j) | Sélection | Fond de l'onglet actif qui glisse vers le nouvel onglet plutôt qu'un changement instantané |

### 5.4 Ce qu'il ne faut pas faire

- Pas d'animation sur le scroll de la page entière (parallax, éléments qui apparaissent au scroll) — inutile sur un dashboard consulté quotidiennement, et coûteux en performance sur les connexions mobiles ciblées par le PRD.
- Pas de son ni de vibration.
- Pas d'animation qui bloque l'interaction (l'utilisateur doit pouvoir cliquer pendant qu'une transition se joue).
