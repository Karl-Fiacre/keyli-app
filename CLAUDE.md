# Keyli — Instructions projet

Plateforme immobilière de confiance pour la Côte d'Ivoire (pilote Abidjan),
ambition sous-régionale ouest-africaine à terme. Éditeur : Nguessan-IT.
Web/PWA (React) + Mobile (React Native, cible) + Supabase. Dev solo assisté
par Claude Code : Fiacre Nguessan.

## Avant de commencer une session

**Ne pas improviser l'ordre de lecture.** Utiliser le message d'initialisation
de `docs/INSTRUCTIONS_CLAUDE_CODE.md` — il liste l'ordre exact :
`docs/SETUP.md` → `docs/PRD_REGLES.md` → `docs/DATABASE.md` →
`docs/CONVENTIONS.md` → `docs/etat_avancement.md`, puis le module du jour
dans `docs/MODULES/`.

## À la fin d'une session

Mettre à jour `docs/etat_avancement.md` : fichiers terminés, fichiers en
cours, décisions prises, blocages rencontrés, prochaine étape recommandée.
C'est le seul mécanisme fiable pour qu'une session future reprenne où
celle-ci s'est arrêtée — la conversation ne persiste pas d'une session à
l'autre.

## Règle d'or — architecture (répétée volontairement dans plusieurs fichiers)

**Supabase (Postgres + RLS + Edge Functions) est la seule source de vérité.**
Le web et le mobile n'exécutent jamais seuls un calcul métier sensible
(dépassement de forfait, vérification, montant de transaction) — RLS et les
Edge Functions sont la vraie protection, pas l'UI. Détail complet :
`docs/PRD_REGLES.md`.

## Stack technique (non négociable sans validation explicite)

Voir `docs/STACK.md`. Ne pas proposer d'alternative (PHP, Firebase, autre
BaaS) sans relire ce fichier et `docs/DATABASE.md` section 13.2 du PRD —
ces questions ont déjà été posées et tranchées avec justification écrite.

## Documents de référence (à lire à la demande, pas à charger en entier par défaut)

| Fichier | Contenu |
|---|---|
| `docs/CONTEXT.md` | Vue d'ensemble courte du projet |
| `docs/STACK.md` | Stack technique définitive |
| `docs/DATABASE.md` | Schéma cible, décisions actées, dette technique historique |
| `docs/DATABASE_LOGIC.md` | Requêtes par écran, index requis, écritures atomiques |
| `docs/ROLES.md` | Matrice de permissions par rôle |
| `docs/PRD_REGLES.md` | Règles métier critiques consolidées |
| `docs/prd.md` | PRD complet (copie markdown du .docx officiel) |
| `docs/LOGO.md` | Marque : logo, badge, règles d'usage |
| `docs/DESIGN_SYSTEM.md` | Charte visuelle appliquée à l'interface — à suivre sur tout écran |
| `docs/ANIMATIONS.md` | Transitions et animations |
| `docs/SETUP.md` | Checklist de démarrage du projet Supabase |
| `docs/MODULES/*.md` | Détail par fonctionnalité |
| `docs/STRUCTURE_BACKEND.md` / `STRUCTURE_FRONTEND.md` | Arborescence web/mobile |
| `docs/etat_avancement.md` | État réel d'avancement, mis à jour à chaque session |
| `docs/reference/schema_cible_reference.sql` | Schéma SQL cible complet — référence, pas à exécuter en bloc |
| `docs/calendrier.md` / `INSTRUCTIONS_PAR_SEMAINE.md` | Planning et blocs copiables-collables par semaine |
| `docs/SEED_DATA.md` | Données de test pour le projet Supabase de développement |
| `docs/design-reference/` | Captures d'écran et icônes de référence visuelle |

## Règles immuables du projet

- Le projet Supabase démarre **vide** — tables créées une à une, module par
  module (voir `docs/SETUP.md`), jamais via une migration unique.
- Tables/enums canoniques suffixées `_keyli` uniquement.
- RLS activée **et** policies écrites dans la même migration.
- Ne jamais committer de clé secrète, `.env` avec de vraies valeurs, ou la
  clé `service_role`.
- Toute nouvelle entité ou tout nouveau champ doit être ajouté à
  `docs/DATABASE.md` le jour même — pas différé en fin de projet.
- Si une demande contredit `docs/PRD_REGLES.md` ou `docs/DATABASE.md` : le
  signaler avant d'exécuter, ne pas trancher seul.
- Logo et badge de vérification sont deux assets distincts, jamais confondus
  (`docs/LOGO.md`).

## Style de code et conventions

Voir `.claude/rules/` — un fichier par sujet (React web, React Native
mobile, Supabase backend, workflow Git), chargé uniquement pour les fichiers
concernés.

## Commandes utiles

```bash
npm install                          # installer les dépendances
npm run dev                          # lancer le web en développement
npm run build                        # vérifier que le build passe
supabase gen types typescript        # régénérer les types après migration
supabase functions deploy <nom>      # déployer une Edge Function
```
