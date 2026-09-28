# DESIGN_SYSTEM — Charte visuelle exacte — Keyli

Consolide `LOGO.md` et `KEYLI_DASHBOARD_DESIGN_SPEC.md` en une seule
référence. **Toute couleur, typographie, rayon ou ombre utilisé dans un
écran vient de ce fichier** — jamais une valeur inventée à la volée dans un
composant. Source réelle des tokens : `src/index.css` et
`tailwind.config.ts` (déjà en place, ne pas en créer une version parallèle).

## ✅ Décision actée — différenciation volontaire, pas une dérive
Vérification faite en comparant ce fichier aux `:root{}` réellement présents
dans les 4 écrans maquettés (Accueil, Agence, Propriétaire, Chercheur) — la
palette n'est **pas unifiée**, et **c'est désormais un choix confirmé, pas
un oubli** : l'Accueil (public) garde son ton chaleureux (or, rayon
`0.9rem`), les 3 dashboards authentifiés gardent leur registre fonctionnel
(violet/orange/rouge contextuels, rayon `0.75rem`). Ne pas unifier ces
valeurs en implémentant — les deux registres sont voulus.

## Palette — tokens partagés par les 4 écrans
```
--primary        218 47% 12%    #1a1f2e   Navy — couleur dominante partout
--primary-glow   218 47% 25%    #2a3d66   Navy clair — liens/accents secondaires
--success        142 71% 45%    #21c45d   Vert — vérifié, hausse, positif
--secondary      210 40% 96.1%  #eef2f7   Fond de carte/zone secondaire
--muted-fg       215.4 16.3% 46.9%        Texte secondaire/gris
--border         214.3 31.8% 91.4%        Bordures
```
⚠️ `#22c55e` (vert Tailwind standard) a circulé dans une version précédente
de ce fichier comme équivalent de `--success` — ce n'est pas exact. La
valeur calculée réelle de `hsl(142 71% 45%)` est `#21c45d`. Utiliser la
valeur HSL comme référence, pas un hex mémorisé approximativement.

## Couleur d'accent — différenciée par écran (décision actée)
| Écran | Token d'accent | Valeur | Usage |
|---|---|---|---|
| Accueil (public) | `--gold` | `38 51% 45%` / `#b8862f` | Bouton recherche, CTA, prix mis en avant |
| Dashboard Agence | `--purple` | `262 83% 58%` / `#7c3bec` | Tags "Leads", badge "Insight IA" |
| Dashboard Agence + Propriétaire | `--pending` | `25 95% 53%` | Statuts "en attente/en revue" |
| Dashboard Chercheur | `--destructive` | `0 84.2% 60.2%` | Cœur favori actif |

Le gold (`#b8862f`) est aussi la couleur des documents de marque (logo,
PRD, pitch deck — voir LOGO.md) — sur l'Accueil, c'est cohérent avec
l'identité de marque au sens large. Sur les dashboards, l'accent violet/
orange/rouge reste contextuel à l'action, pas à la marque — **confirmé
comme registre voulu** : public = chaleureux, application = fonctionnel.
Ne pas fusionner ces deux registres en implémentant, même par souci de
cohérence visuelle apparente.

## Rayons, ombres, espacement
```css
--radius: 0.75rem              /* dashboards — cartes, boutons */
--radius-accueil: 0.9rem       /* Accueil uniquement — différenciation actée, pas un écart */
--radius-pill: 999px           /* badges, chips, boutons pilule — cohérent partout */
--shadow-card: 0 4px 20px -4px hsl(218 47% 12% / 0.1)
--shadow-lift: 0 24px 48px -12px hsl(218 47% 12% / 0.28)   /* hover cartes */
```

## Typographie
- Titres : Cambria (serif) — utilisé sur les documents officiels (PRD,
  pitch deck) et les gros titres marketing (Accueil)
- Corps de texte / UI : police système par défaut (`-apple-system,
  BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) — pas de police
  serif dans les dashboards ou formulaires, seulement sur les écrans
  marketing/documents


## Les deux marques — ne jamais confondre
| Marque | Usage | Fichier source |
|---|---|---|
| Logo Keyli (clé + toit) | Identité de marque : header, splash, favicon, icône d'app | `keyli_brand_assets/`, voir LOGO.md |
| Badge de vérification (cercle + coche) | Affiché SUR une annonce/un profil vérifié uniquement | `assets/keyli_verified_badge.svg` |

Détail complet des règles d'usage, palette de secours, et assets manquants
(logotype complet) : voir `LOGO.md`, qui reste la référence pour tout ce qui
touche à la marque elle-même. Ce fichier-ci couvre l'application de la
charte à l'interface (composants, écrans).

## Composants dashboard — patterns visuels obligatoires
Détail complet : `KEYLI_DASHBOARD_DESIGN_SPEC.md` + captures dans
`design-reference/`. Résumé des règles non négociables :
- Carte KPI : label 12px/600 gris secondaire, valeur 24-26px/700 navy,
  variation en badge coloré (vert = hausse, rouge = baisse)
- Badge "Vérifié" : toujours vert `--success`, jamais une autre couleur
  même sur fond sombre
- Statut "en attente/en revue" : couleur `--pending` (orange `25 95% 53%`,
  token déclaré dans `src/index.css` avec les autres — voir tableau
  ci-dessus et KEYLI_DASHBOARD_DESIGN_SPEC.md §1) — jamais rouge (réservé
  aux erreurs) ni gris (réservé à l'inactif)
- Sidebar dashboard : fond navy plein sur Agence, fond blanc/bordure sur
  Propriétaire et Chercheur — cohérent avec les maquettes déjà livrées, ne
  pas harmoniser les trois sur un seul style sans le signaler d'abord (choix
  visuel déjà fait, pas un oubli)

## Écrans de référence
Voir `design-reference/*.png` pour l'aperçu visuel de chaque écran clé
(Accueil, dashboards Agence/Propriétaire/Chercheur) et
`keyli_dashboards_preview.html` pour la version interactive avec animations.
Les PNG sont des captures figées (pour référence rapide sans navigateur) —
la version HTML reste la référence de comportement (hover, transitions).
