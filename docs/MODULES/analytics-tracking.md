# MODULE : Tracking des interactions (vues, clics) & analytics

Résout deux prérequis précédemment marqués ⚠️ bloquants : le KPI "Vues 30j"
des dashboards (dashboard.md) et la donnée source des quartiers tendance
(quartiers-tendance.md). Table nouvelle, à créer dans le schéma neuf dès la
première vague de migrations.

## Table
```sql
CREATE TYPE interaction_type_keyli AS ENUM (
  'view', 'click_contact', 'click_phone', 'click_whatsapp',
  'click_favorite', 'click_gallery', 'click_map', 'search_neighborhood'
);

CREATE TABLE property_interactions_keyli (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID REFERENCES properties_keyli(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) NULL,  -- NULL = visiteur anonyme
  session_id        TEXT NOT NULL,   -- UUID généré côté client, stocké en localStorage
  interaction_type  interaction_type_keyli NOT NULL,
  source            TEXT,            -- 'search' | 'map' | 'recommandation' | 'lien_direct' | 'quartier_tendance'
  quartier_id       UUID REFERENCES quartiers_keyli(id),  -- copie dénormalisée au moment de l'événement
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_interactions_property ON property_interactions_keyli(property_id, created_at DESC);
CREATE INDEX idx_interactions_type_date ON property_interactions_keyli(interaction_type, created_at DESC);
CREATE INDEX idx_interactions_quartier ON property_interactions_keyli(quartier_id, interaction_type, created_at DESC);
```
`quartier_id` est dupliqué depuis `properties_keyli.quartier_id` au moment
de l'écriture — volontaire : si l'annonce change de quartier ou est
supprimée plus tard, l'historique de tendance ne doit pas se corrompre
rétroactivement. La normalisation (Option A, `communes_keyli`/`quartiers_keyli`)
élimine le risque de variantes orthographiques, mais pas le risque de
réécriture rétroactive de l'historique — d'où la copie plutôt qu'une jointure.

## Compteurs dénormalisés (lecture rapide dashboard, pas de agrégation à la volée)
```sql
ALTER TABLE properties_keyli ADD COLUMN views_count INTEGER DEFAULT 0;
ALTER TABLE properties_keyli ADD COLUMN contacts_count INTEGER DEFAULT 0;
```

## Trigger — mise à jour synchrone des compteurs + anti-inflation
```sql
CREATE OR REPLACE FUNCTION fn_after_property_interaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interaction_type = 'view' THEN
    -- Anti-inflation : une même session ne recompte pas une vue sur le même
    -- bien avant 30 minutes (évite qu'un simple refresh gonfle le compteur)
    IF NOT EXISTS (
      SELECT 1 FROM property_interactions_keyli
      WHERE property_id = NEW.property_id AND session_id = NEW.session_id
        AND interaction_type = 'view' AND created_at > NOW() - INTERVAL '30 minutes'
        AND id != NEW.id
    ) THEN
      UPDATE properties_keyli SET views_count = views_count + 1 WHERE id = NEW.property_id;
    END IF;
  ELSIF NEW.interaction_type IN ('click_contact','click_phone','click_whatsapp') THEN
    UPDATE properties_keyli SET contacts_count = contacts_count + 1 WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_property_interaction
AFTER INSERT ON property_interactions_keyli
FOR EACH ROW EXECUTE FUNCTION fn_after_property_interaction();
```
Le trigger reste volontairement synchrone et minimal (juste les compteurs
affichés en dashboard) — tout calcul plus lourd (tendance de quartier,
agrégats hebdomadaires) part sur le webhook ci-dessous, pas sur ce trigger,
pour ne jamais ralentir l'insertion d'un événement de tracking.

## Database Webhook — enrichissement asynchrone
```
Supabase Dashboard → Database → Webhooks
Trigger : AFTER INSERT ON property_interactions_keyli
Cible   : Edge Function process-interaction-webhook (à créer)
```
Rôle de l'Edge Function : agrégations plus lourdes qui ne doivent pas
bloquer l'écriture (ex. mise à jour incrémentale des tendances de quartier
pour MODULES/quartiers-tendance.md, détection de pics de clics suspects
pour anti-fraude). Ne pas mettre cette logique dans le trigger SQL
lui-même — un webhook échoue et se retente indépendamment de l'insertion,
un trigger SQL qui échoue annule l'insertion.

## Ce que ça résout, ce que ça ne résout pas encore
- [x] KPI "Vues 30j" (dashboard.md) : `SUM(views_count)` ou requête sur
      `property_interactions_keyli` filtrée sur 30 jours, au choix selon la
      précision voulue (compteur = rapide, table brute = filtrable par date
      exacte)
- [x] Source de données pour quartiers-tendance.md : `quartier_id` +
      `interaction_type = 'search_neighborhood'` alimente le calcul, cadence
      et fenêtre de calcul restent À TRANCHER (voir quartiers-tendance.md,
      non résolu par ce module)
- [ ] Score de pertinence des recommandations (dashboard.md, dashboard
      Chercheur) — cette table donne la matière première (historique
      d'interactions par utilisateur) mais aucun algorithme de scoring n'est
      défini ici, à concevoir séparément

## Règles
- [ ] `session_id` généré côté client à la première visite, persistant en
      localStorage — jamais régénéré à chaque page pour ne pas fausser
      l'anti-inflation
- [ ] Écriture de l'interaction déclenchée côté client (hook `useTracking`
      ⚠️ à créer) — ne jamais faire dépendre le tracking d'une action admin
      ou d'un batch différé
- [ ] RLS sur `property_interactions_keyli` : INSERT ouvert (y compris
      anonyme), SELECT restreint au propriétaire du bien concerné et à
      l'admin — pas de lecture publique des événements bruts (à la
      différence de `ratings_keyli` qui est public par design)
