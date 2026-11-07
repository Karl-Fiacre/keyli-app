# Animations & Transitions — Keyli

Détail complet et justification de chaque effet : voir
KEYLI_DASHBOARD_DESIGN_SPEC.md section 5. Ce fichier est la version
condensée pour référence rapide pendant le codage.

## ⚠️ Registre cinématique — décision du porteur (2026-11-07)

Demande : « animations cinématiques des éléments du site, transitions
cinématiques, pour rendre la plateforme très impressionnante ». Choix :
**cinématique complet**, sur l'accueil, les transitions de page, les pages
publiques et les tableaux de bord. Cette décision **remplace** le registre
« élégant et discret » du 2026-11-02, la limite de 500 ms, l'interdiction du
parallax et de Framer Motion (règles ci-dessous amendées en conséquence).

- **Bibliothèque** : Motion (`motion@14.6.0`, ex-Framer Motion), environ
  44 Ko compressés. `MotionConfig reducedMotion="user"` dans `App.tsx` :
  si l'appareil demande de limiter les animations, Motion coupe les
  déplacements ; les classes CSS sont neutralisées par la règle
  `prefers-reduced-motion` de `dashboard-animations.css`.
- **Rythmes communs** : `src/lib/cinema.ts` (courbes `EASE_CINEMA`,
  `EASE_RIDEAU`, durées 0,35 / 0,6 / 0,9 / 1,2 s, variantes « mise au
  point », « masque », « profondeur ») ; en CSS, `--kf-cinema` (900 ms) et
  `--kf-ease-cinema`.
- **Transition de page** (`TransitionPage`) : site public = rideau bleu nuit
  à liseré turquoise et logo, ~1 s, puis la page sort du flou ; tableaux de
  bord = mise au point seule (0,6 s). Pas de rideau au premier affichage.
- **Composants** (`src/components/animation/`) : `TexteCinema` (titre
  révélé mot à mot, texte complet pour les lecteurs d'écran), `Revele`
  (apparition à l'entrée dans l'écran), `FondScene` (décor des bannières :
  motif en profondeur, halos qui dérivent, balayage de lumière),
  `CarteInclinee` (inclinaison 3D + reflet sous la souris, jamais au doigt).
- **Accueil** : ouverture orchestrée de la bannière, contenu qui s'efface en
  profondeur au défilement, vidéo qui « s'ouvre » comme un écran de cinéma
  (pilotée par le défilement), cartes d'annonce révélées puis inclinables,
  titres de section mot à mot.
- **Pages publiques** : titres mot à mot (recherche, fiche, réservations,
  favoris, annonces, pages légales, 404), décor `FondScene` sur À propos et
  Pilote, carte de connexion / inscription en profondeur, trait de
  progression du défilement sous l'en-tête.
- **Tableaux de bord** : cascades, tracés, donuts, barres plus amples
  (CSS) ; indicateur de navigation à ressort avec liseré turquoise.
- **Garde-fous** : aucun état final ne garde de flou ou de décalage
  (`transitionEnd`, `filter: none`), sinon les éléments fixes ou collants
  cassent ; animations continues limitées aux halos de la bannière.

## Constantes globales
```css
--kf-fast: 150ms;
--kf-base: 250ms;
--kf-slow: 400ms;
--kf-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--kf-ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
```
Fichier source : `src/styles/dashboard-animations.css` — **créé le
2026-10-31** avec la cloche de notifications (constantes ci-dessus, règle
prefers-reduced-motion, classes `kf-cloche-oscille` (effet 8),
`kf-pastille-apparait` (effet 7), `kf-panneau-ouvre`). Complété en
semaine 11 (2026-11-02) : `kf-cascade` (effet 1, décalage via la variable
`--kf-delai`), `kf-trace` (3, tracé avec `pathLength="1"`), `kf-donut` (4),
`kf-barre` (5, `scaleX`, décalage `--kf-delai`), `kf-glisse-gauche`
(InsightCard), `kf-souleve` (9, survol) — tous neutralisés en mouvements
réduits. Hook `src/hooks/useCountUp.ts` (effet 2) : 0 → valeur en 600 ms
ease-out, une seule fois au premier chargement, valeur finale immédiate en
mouvements réduits, sans dépendance. Utilisé par `KpiCard` (prop `nombre`,
cascade par `rang`). **Décision du porteur (2026-10-30) : ni Framer Motion
ni `@dnd-kit`.** Le pipeline de leads change d'étape par un menu sur chaque
carte (`LeadCard`), sans glisser-déposer ni animation de layout.
~~Aucune animation ne doit dépasser 500ms~~ — levé le 2026-11-07 (registre
cinématique ci-dessus) : durées jusqu'à ~1,2 s.

## Site public — registre « élégant et discret » (porteur, 2026-11-02) — remplacé le 2026-11-07, historique
Même fichier, mêmes constantes, toutes neutralisées en mouvements réduits :
- **Changement de page** : `TransitionPage` (`src/components/animation/`)
  enveloppe le contenu de `MiseEnPage` et de `DashboardShell` — fondu +
  montée de 6 px, 250 ms (`kf-page`), clé = première partie de l'adresse
  (changer de conversation ne rejoue pas l'animation). Remonte en haut de
  page à chaque navigation, sauf retour arrière.
- **Apparition au défilement** : `ZoneRevele` pose `data-visible` une seule
  fois (hook `useRevele`) ; ses enfants `kf-revele` apparaissent (fondu +
  12 px, 400 ms), en cascade via `delaiCascade(i)` (`src/lib/animation.ts`,
  plafonné à 420 ms). `kf-revele-trait` : filet qui se trace (500 ms).
  Utilisé sur les sections de l'accueil sous la bannière.
- **Photos** : `ImageFondu` — fondu de 300 ms à la fin du chargement
  (`kf-photo`), immédiat si l'image est en cache. Galerie de la fiche :
  fondu enchaîné (l'ancienne photo reste dessous). Cartes d'annonce : zoom
  doux 1,04 au survol (`kf-zoom`, 400 ms).
- **Résultats de recherche** : cascade `kf-cascade` (×50 ms, plafond 300 ms).
- **Favori** : battement du cœur à l'ajout seulement (`kf-battement`, 250 ms).
- **Menu mobile** : ouverture `kf-panneau-ouvre`. En-tête public collant
  (fond légèrement translucide).

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
   pas réécrire de keyframes équivalents ailleurs. Animations Motion : partir
   de `src/lib/cinema.ts` et des composants de `src/components/animation/`.
2. Le compteur de valeur (`useCountUp`) est un hook dépendance-zéro — ne pas
   ajouter Framer Motion pour ce seul besoin.
3. Pas de drag-and-drop pour le pipeline de leads : changement d'étape par
   menu (décision du porteur, 2026-10-30) ; `@dnd-kit/core` reste non
   installé. Motion est installé depuis le 2026-11-07 (registre cinématique).
4. ~~Pas de parallax ni d'animation pilotée par le défilement~~ — levé le
   2026-11-07 : parallax et effets de défilement autorisés (Motion
   `useScroll`, jamais d'écouteur `scroll` écrit à la main). Texte d'origine :
   pas de parallax ni d'animation pilotée en continu par le défilement —
   coût de performance inutile sur les connexions mobiles ciblées par le
   pilote. **Amendement du porteur (2026-11-02)** : seule exception, une
   apparition légère et unique des sections quand elles entrent dans
   l'écran (`ZoneRevele` + `kf-revele`, IntersectionObserver, aucun
   écouteur `scroll`).
5. Pas de son, pas de vibration.
