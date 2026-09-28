# Modules — Statut de couverture

Sur le modèle SGS Connect, chaque module a son propre `MODULES/nom.md` avec
règles, flux et formats de données exacts. **Tous les modules identifiés
sont maintenant livrés.**

## Modules livrés
- [x] auth.md
- [x] annonces.md
- [x] verification.md
- [x] pricing.md — table `plans_keyli` créée (Option B), plus aucun blocage
- [x] messagerie.md
- [x] notation.md
- [x] dashboard.md — formats cibles par rôle ; dépendait de
      quartiers-tendance et de la relation agent↔agence, les deux résolus
      (voir prérequis DB ci-dessous)
- [x] admin.md
- [x] quartiers-tendance.md — le moins mûr, surtout des questions ouvertes
- [x] geolocalisation.md — recherche par rayon, PostGIS tranché pour le
      nouveau schéma (voir DATABASE.md, nouveau départ)
- [x] analytics-tracking.md — vues/clics, résout les prérequis #3 (tracking
      des vues) et une partie du #4 (source de données quartiers tendance)
- [x] hebergement-securite.md — recommandation Cloudflare Pages, à confirmer
      avec le fondateur (hébergement pas encore décidé)
- [x] leads-visites.md — pipeline de leads et visites, 2 tables trouvées
      manquantes lors d'un rescan (leads_keyli, visits_keyli), ajoutées
- [x] mobile.md — Phase 3, modules natifs, distribution bêta, soumission
      stores. Trouvé manquant lors d'un rescan : STRUCTURE_FRONTEND.md et
      .claude/rules/react-native-mobile.md couvraient l'arborescence et les
      conventions de code, mais rien ne détaillait les modules natifs ni le
      processus de soumission — le seul module référencé sans exister.

## Prérequis DB découverts en écrivant ces modules, à traiter avant le code
1. ~~Migration `subscription_plan_keyli` → 3 forfaits réels~~ — RÉSOLU :
   table `plans_keyli` (Option B), voir DATABASE.md et pricing.md
2. ~~Aucune table ne modélise la relation agent ↔ agence~~ — RÉSOLU : un seul
   compte agence, agents internes sans connexion propre, table
   `agency_agents_keyli` (voir DATABASE.md et dashboard.md)
3. ~~Aucun mécanisme de tracking des vues d'annonce confirmé~~ — RÉSOLU par
   analytics-tracking.md (`property_interactions_keyli` + compteurs
   dénormalisés)
4. ~~`neighborhood` en TEXT libre sans normalisation~~ — RÉSOLU : Option A,
   hiérarchie fermée `communes_keyli` → `quartiers_keyli`,
   `properties_keyli.quartier_id` en FK (voir DATABASE.md et
   quartiers-tendance.md). Résout aussi la confusion commune/quartier
   présente dans les maquettes (Cocody = commune, Riviera = quartier).
5. ~~Aucune extension géospatiale active~~ — RÉSOLU : PostGIS tranché pour
   le nouveau schéma (voir DATABASE.md, geolocalisation.md)

**Les 5 prérequis initiaux sont désormais tous résolus.** Reste seulement
ouvert, dans quartiers-tendance.md : le calcul de tendance lui-même (fenêtre
de temps, fréquence de recalcul, ce qui compte comme "recherche") — un
niveau de détail différent, pas un prérequis bloquant à la même échelle que
les 5 précédents.

## Tables trouvées manquantes lors d'un rescan (après résolution des 5 prérequis initiaux)
4 tables absentes malgré des fonctionnalités déjà maquettées et documentées
comme exigences : `leads_keyli`, `visits_keyli` (pipeline agence, visites —
voir MODULES/leads-visites.md), `favorites_keyli`, `search_alerts_keyli`
(voir MODULES/annonces.md). Ajoutées à `reference/schema_cible_reference.sql`
avec RLS. Leçon : une maquette validée ou une exigence PRD "Must/Should" ne
garantit pas qu'une table existe — vérifier systématiquement, ne pas
supposer que documenté ailleurs = modélisé en base.

Ne pas laisser Claude Code contourner ces prérequis par une solution de
fortune — les remonter comme blocants avant d'écrire le code qui en dépend.

