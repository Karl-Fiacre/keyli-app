# Animations & Transitions — Keyli

Détail complet et justification de chaque effet : voir
KEYLI_DASHBOARD_DESIGN_SPEC.md section 5. Ce fichier est la version
condensée pour référence rapide pendant le codage.

## Constantes globales
```css
--kf-fast: 150ms;
--kf-base: 250ms;
--kf-slow: 400ms;
--kf-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--kf-ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
```
Fichier source : `src/styles/dashboard-animations.css` — **à créer**
(calendrier Phase 1, Sem. 11, avec `useCountUp.ts`). Il n'existe pas encore :
ces constantes sont les valeurs à y reprendre à sa création.
Aucune animation ne doit dépasser 500ms (KEYLI_DASHBOARD_DESIGN_SPEC.md
5.2). Seule exception spécifiée : le compteur de valeur KPI, 600ms (5.3).

## Règle prefers-reduced-motion (OBLIGATOIRE)
À implémenter dans `dashboard-animations.css` dès sa création (voir
KEYLI_DASHBOARD_DESIGN_SPEC.md 5.2) — ensuite, ne pas la retirer en copiant
des classes vers un nouveau composant sans vérifier qu'elle suit.

## Effets par composant (résumé — détail dans KEYLI_DASHBOARD_DESIGN_SPEC.md 5.3)
1. KpiCard — cascade fade+translateY au chargement, délai ×60ms entre cartes
2. Valeur KPI — compteur 0→cible, 600ms ease-out (`useCountUp.ts`)
3. Sparkline — tracé de ligne au chargement (`stroke-dashoffset`)
4. DonutChart — fade + scale(0.9→1) au chargement
5. TrendBar / barre de comparaison — largeur 0→cible, stagger ×80ms
6. VerificationStepper — remplissage du cercle puis tracé de la ligne suivante
7. Badges "nouveau" — scale(0.8→1) + fondu, rebond léger
8. Cloche de notification — une oscillation courte à la réception
9. LeadCard / RecommendationCard — hover translateY(-2px) + ombre
10. Boutons — scale(0.97) au clic

## Règles Claude Code
1. Importer les classes depuis `src/styles/dashboard-animations.css` — ne
   pas réécrire de keyframes équivalents ailleurs.
2. Le compteur de valeur (`useCountUp`) est un hook dépendance-zéro — ne pas
   ajouter Framer Motion pour ce seul besoin.
3. Drag-and-drop du pipeline de leads et animations de layout (une carte qui
   se déplace entre colonnes) nécessitent Framer Motion + `@dnd-kit/core` —
   dépendances NON installées, décision explicitement laissée ouverte
   (voir KEYLI_DASHBOARD_DESIGN_SPEC.md 5.1) — demander confirmation avant
   d'ajouter l'une ou l'autre.
4. Pas d'animation sur le scroll de page (parallax) — coût de performance
   inutile sur les connexions mobiles ciblées par le pilote.
5. Pas de son, pas de vibration.
