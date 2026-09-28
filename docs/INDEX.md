# Keyli — Index des documents Claude Code

Voir `CLAUDE.md` à la racine du dépôt (chargé automatiquement par Claude
Code) pour les règles immuables du projet — ce fichier détaille la
hiérarchie de lecture complète.

## Règle anti-décision-silencieuse
Toute décision qui n'est pas documentée ici n'existe pas.
Si Claude Code ne trouve pas une règle, il DOIT demander avant d'implémenter.

## Hiérarchie de lecture obligatoire
```
0. etat_avancement.md        → Où la dernière session s'est arrêtée — TOUJOURS EN PREMIER
1. PRD_REGLES.md              → Règles métier — PRIORITÉ ABSOLUE (résumé de prd.md)
2. DATABASE.md                → Structure des données — ne jamais dévier
3. DATABASE_LOGIC.md          → Requêtes, transactions, cohérence entre tables
4. CONVENTIONS.md             → Comment écrire le code
5. DESIGN_SYSTEM.md           → Charte visuelle appliquée à l'interface
6. LOGO.md                    → Marque (logo, badge) — ne jamais réinventer
7. ANIMATIONS.md              → Transitions et animations
8. STRUCTURE_BACKEND.md / STRUCTURE_FRONTEND.md
9. MODULES/*.md               → Détail d'implémentation par module
10. ROLES.md                  → Rôles et permissions
```

## Fichiers critiques à lire avant toute session de code
etat_avancement.md → DATABASE.md → CONVENTIONS.md → STRUCTURE_BACKEND.md → MODULES/auth.md

## Documents complémentaires (à lire à la demande, pas par défaut)
| Fichier | Rôle |
|---|---|
| `prd.md` | PRD complet — texte intégral, PRD_REGLES.md en est le résumé opérationnel |
| `calendrier.md` / `INSTRUCTIONS_PAR_SEMAINE.md` | Planning complet / blocs copiables-collables par semaine |
| `SEED_DATA.md` | Données de test pour le projet Supabase de développement |
| `design-reference/` | Captures d'écran et icônes de référence visuelle |
| `KEYLI_DASHBOARD_DESIGN_SPEC.md` | Détail des composants dashboard et de leurs animations — référencé par DESIGN_SYSTEM.md, CONVENTIONS.md et .claude/rules/react-web.md |

## ⚠️ Nouveau départ base de données — à lire avant de toucher au schéma
Décision actée : nouveau compte Supabase, projet **vide, sans aucune table**
au démarrage. Schéma reconstruit de zéro, pas migré depuis l'ancien pilote,
et construit **table par table au fur et à mesure de chaque module** — voir
SETUP.md pour la checklist exacte, `reference/schema_cible_reference.sql`
pour le schéma cible (à consulter par morceaux, jamais à exécuter en bloc).
L'ancien schéma (documenté dans DATABASE.md à titre de référence de
nommage/logique) contenait des tables et enums en double (`properties` ET
`properties_keyli`, etc.) — le nouveau schéma ne reprend que la convention
`_keyli`. PostGIS activé dès le départ pour la géolocalisation — voir
MODULES/geolocalisation.md.

## ⚠️ Nouveau dépôt de code — décision du 2026-09-28
Le web est reconstruit dans un **nouveau projet** React/Vite/TypeScript, pas
repris de l'ancien pilote. Toute mention de code « existant » ou « déjà en
place » dans ce paquet (pages, hooks, Edge Functions, Playwright, tokens CSS,
dépendances) désigne l'ancien pilote : seul fait foi ce qui est coché dans
`etat_avancement.md`.

## Règle absolue — Logo
Le logo Keyli (clé + toit) et le badge de vérification sont deux assets distincts
à usage différent — voir LOGO.md. Ne jamais réinventer un tracé approximatif.

## Statut de ce paquet de documentation
Socle ET modules livrés (voir MODULES/README.md pour le détail des
prérequis DB découverts en cours de route — plusieurs modules dépendent de
décisions ou de tables qui n'existent pas encore).
