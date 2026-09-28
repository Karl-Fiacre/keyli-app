# MODULE : Dashboards (par rôle)

Fichiers : `UserDashboard.tsx`, `OwnerDashboard.tsx`,
`AgencyDashboard.tsx` ⚠️ à créer. Composants : voir
KEYLI_DASHBOARD_DESIGN_SPEC.md section 2-3. Référence visuelle exacte :
`keyli_dashboards_preview.html`.

Aucun endpoint unique "GET /dashboard" n'existe — chaque dashboard compose
plusieurs requêtes Supabase via des hooks dédiés. Les formes ci-dessous sont
la forme *cible* que chaque hook doit produire, pas un contrat d'API figé.

## Dashboard owner (propriétaire)
```ts
// useOwnerDashboard() — cible, hook à créer
{
  kpis: {
    mesAnnonces: number,          // COUNT properties_keyli WHERE owner_id = user
    vues30j: number,               // properties_keyli.views_count (voir MODULES/analytics-tracking.md)
    contactsRecus: number          // COUNT messages_keyli WHERE to_user = user (30j)
  },
  verification: {
    etape: 'identite' | 'document' | 'validation' | 'verifie',
    delaiMoyen: string             // texte informatif, pas une donnée temps réel calculée
  },
  biens: Array<{
    id: string, titre: string, prix: number, statut: 'verifiee' | 'en_revue',
    prixMarcheQuartier: number     // ⚠️ dépend du MODULE quartiers-tendance,
                                    //    non construit — placeholder tant que non livré
  }>,
  messages: Array<{ from: string, preview: string, nouveau: boolean }>,
  visites: Array<{ date: string, bien: string, contact: string }>
  //   depuis visits_keyli WHERE scheduled_by = uid (table ajoutée au rescan)
}
```

## Dashboard agency (agence) — à créer
```ts
// useAgencyDashboard() — cible, hook à créer
{
  kpis: { annoncesActives: number, vues30j: number, leadsActifs: number, noteMoyenne: number },
  pipeline: {
    nouveau: Array<Lead>, visitePlanifiee: Array<Lead>,
    negociation: Array<Lead>, conclu: Array<Lead>
  },
  // Lead = ligne de leads_keyli (voir DATABASE.md, section "Pipeline de leads &
  // visites" — table trouvée manquante au rescan, ajoutée depuis) :
  // { id, nom: contact_nom ?? profil lié, bien: property_id → titre,
  //   derniereActivite: updated_at, agentAssigne?: agent_id → nom }
  statutAnnonces: { verifiees: number, enAttente: number, brouillon: number },
  insights: Array<{ type: 'warn'|'ok'|'neutre', texte: string }>,
  //   ⚠️ génération des insights = règles à définir, pas un modèle IA
  //   entraîné — commencer par des règles simples (seuils fixes) documentées
  //   ici avant d'envisager autre chose
  equipe: Array<{ agentId: string, nom: string, annonces: number, conversion: number, note: number }>
  //   DÉCISION ACTÉE : agents internes à l'agence, sans compte de connexion
  //   séparé — table agency_agents_keyli (voir DATABASE.md). "note" ici est
  //   la note moyenne des biens attribués à cet agent (via
  //   properties_keyli.agent_id → ratings_keyli), pas une note propre à
  //   l'agent qui n'a pas de profil utilisateur indépendant.
}
```

## Dashboard user (chercheur) — existant, à enrichir
```ts
// useUserDashboard() — cible
{
  recommandations: Array<{ bien: string, prix: number, pertinence: number }>,
  //   ⚠️ "score de pertinence" = à définir (filtre sur recherches passées ?
  //   favoris ? aucun mécanisme de recommandation existant à ce jour)
  alertes: Array<{ critere: string, nouvelles: number }>,
  //   depuis search_alerts_keyli (table ajoutée au rescan — voir DATABASE.md)
  favoris: Array<{ id: string, titre: string, prix: number, verifie: boolean }>,
  //   depuis favorites_keyli JOIN properties_keyli (table ajoutée au rescan)
  tendanceQuartiers: Array<{ quartierId: string, nom: string, communeNom: string, variationPct: number }>,
  //   quartierId/nom depuis quartiers_keyli (Option A, voir DATABASE.md) —
  //   communeNom inclus car l'affichage doit distinguer "Riviera (Cocody)"
  //   d'un quartier homonyme dans une autre commune, le cas échéant.
  //   Calcul lui-même dépend du MODULE quartiers-tendance — non construit
  messages: Array<{ from: string, preview: string, nouveau: boolean }>
}
```

## Règle commune aux 3 dashboards
- [ ] Ne jamais coder de valeurs affichées en dur (les chiffres des maquettes
      — "34", "2 840", "4.6/5" — sont des exemples de démonstration, pas des
      données à reproduire)
- [ ] Toute donnée marquée ⚠️ ci-dessus dépend d'un prérequis non construit —
      demander confirmation avant d'improviser une solution de contournement
