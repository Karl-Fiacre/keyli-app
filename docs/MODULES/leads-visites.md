# MODULE : Pipeline de leads & visites

⚠️ Table trouvée manquante lors d'un rescan du paquet de documentation — le
dashboard Agence maquetté (pipeline Nouveau → Visite planifiée →
Négociation → Conclu) et les "visites à venir" affichées sur les dashboards
Propriétaire et Agence n'avaient aucune table pour les porter avant cette
correction. Schéma : `leads_keyli` + `visits_keyli`, voir
`reference/schema_cible_reference.sql`.

## Pourquoi une table séparée de messages_keyli
Un lead n'est pas qu'une conversation : il a un **statut qui évolue dans le
temps** (Nouveau → Visite planifiée → Négociation → Conclu), peut exister
sans message initial sur la plateforme (contact WhatsApp externe,
`contact_nom` renseigné sans `contact_user_id`), et doit pouvoir être
assigné à un agent précis. `messages_keyli` reste la conversation ; `leads_keyli`
est l'état commercial qui peut référencer un message d'origine
(`source_message_id`) sans en dépendre.

## Création d'un lead
```
1. Un lead est créé automatiquement à la première prise de contact
   (message envoyé depuis PropertyDetails.tsx) → stage = 'nouveau'
   (trigger `creer_lead_au_contact_keyli`, un seul par chercheur et par
   annonce — fait le 2026-10-03)
2. Un lead peut aussi être créé manuellement par le propriétaire/agence
   (ex. contact reçu par téléphone, hors plateforme) → contact_nom renseigné,
   contact_user_id NULL
3. Le propriétaire/agence fait progresser le stage manuellement (glisser-
   déposer dans le pipeline, ou menu de statut — voir ANIMATIONS.md 5.1 pour
   la décision en attente sur le drag-and-drop réel vs changement par menu)
```

## Visites
```
1. Une visite planifiée (visits_keyli) peut être rattachée à un lead
   (lead_id) — pas obligatoire, un propriétaire peut planifier une visite
   sans passer par le pipeline
2. scheduled_by = le compte propriétaire/agence qui programme
3. visitor_user_id si le visiteur a un compte Keyli, sinon visitor_nom
4. status : planifiee → effectuee | annulee — mise à jour manuelle, pas de
   règle automatique de passage (ex. pas de passage auto à "effectuee" le
   jour J, ça resterait "planifiee" jusqu'à confirmation)
```

## Règles
- [x] `leads_keyli.owner_id` doit toujours correspondre au `owner_id` de
      `properties_keyli` référencée par `property_id` — recopié par trigger,
      testé
- [x] `agent_id` (agence uniquement) nullable — un lead peut ne pas encore
      être assigné à un agent précis ; s'il l'est, l'agent appartient à
      l'agence (testé)
- [ ] Le KPI "Leads actifs" du dashboard Agence = COUNT `leads_keyli` où
      `stage != 'conclu'`
- [x] Une visite `annulee` ne doit pas disparaître de l'historique — statut
      conservé, pas de suppression (testé)

## Non couvert ici — à trancher avant le code
- [ ] Notification automatique avant une visite planifiée (rappel) — aucun
      mécanisme défini, pas dans le périmètre v1 confirmé
- [ ] Le pipeline doit-il être réellement glissable (drag-and-drop) ou un
      changement de statut par menu suffit — décision déjà notée comme
      ouverte dans ANIMATIONS.md (dépendance à `@dnd-kit/core`, non installée)
