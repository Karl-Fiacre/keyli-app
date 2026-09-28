-- Keyli — SCHÉMA CIBLE DE RÉFÉRENCE (pas une migration à exécuter telle quelle)
-- ⚠️ Le projet Supabase démarre VIDE, sans aucune table. Les tables sont créées
-- une à une, au fur et à mesure de l'implémentation de chaque module (voir
-- MODULES/*.md et INSTRUCTIONS_CLAUDE_CODE.md) — pas en une seule fois via ce
-- fichier. Ce fichier sert de référence du schéma final visé : copier
-- uniquement la partie correspondant au module en cours de construction.
--
-- Ordre de construction recommandé (suit MODULES/README.md et les
-- dépendances de clés étrangères) :
--   1. Extensions (pgcrypto, postgis) + enums de base
--   2. profiles_keyli (rien n'en dépend, tout en dépend)
--   3. plans_keyli (+ seed) — nécessaire avant subscriptions_keyli
--   4. agency_agents_keyli — nécessaire avant properties_keyli (colonne agent_id)
--   5. communes_keyli, quartiers_keyli (+ seed) — nécessaire avant properties_keyli (colonne quartier_id)
--   6. properties_keyli, property_media_keyli
--   7. documents_keyli
--   8. subscriptions_keyli, transactions_keyli, payment_attempts_keyli
--   9. ratings_keyli, messages_keyli, reports_keyli
--  10. audit_logs_keyli, feedback_keyli, inscription_pilot_keyli,
--      onboarding_checklists_keyli, marketing_templates_keyli, signup_attempts_keyli
--  11. property_interactions_keyli (+ trigger) — module analytics, en dernier
--
-- ============================================================

-- Keyli — Migration initiale (nouveau projet, schéma reconstruit de zéro)
-- Consolide toutes les décisions actées dans keyli-docs-claude-code.zip
-- À exécuter en UNE FOIS sur le nouveau projet Supabase, avant tout code applicatif.

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis;    -- géolocalisation par rayon (MODULES/geolocalisation.md)

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role_keyli AS ENUM ('user','owner','agency','admin');
CREATE TYPE property_type_keyli AS ENUM (
  'maison','duplex','villa','appartement','studio',
  'residence_meublee','auberge','hotel','bureau','magasin'
);
CREATE TYPE property_status_keyli AS ENUM ('a_louer','a_vendre');
CREATE TYPE document_type_keyli AS ENUM ('acd','registre','extrait_naissance','cert_residence');
CREATE TYPE document_status_keyli AS ENUM ('pending','approved','rejected');
CREATE TYPE subscription_status_keyli AS ENUM ('active','expired','canceled');
CREATE TYPE transaction_status_keyli AS ENUM ('pending','completed','failed');
CREATE TYPE report_status_keyli AS ENUM ('pending','reviewed','resolved');
CREATE TYPE inscription_status_keyli AS ENUM ('en_attente','contacte','converti','rejete');
CREATE TYPE priority_level_keyli AS ENUM ('haute','moyenne','basse');
CREATE TYPE interaction_type_keyli AS ENUM (
  'view','click_contact','click_phone','click_whatsapp',
  'click_favorite','click_gallery','click_map','search_neighborhood'
);
-- ⚠️ Pas de subscription_plan_keyli — remplacé par la table plans_keyli ci-dessous (décision actée)

-- ============================================================
-- PROFILS
-- ============================================================
CREATE TABLE profiles_keyli (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  email               TEXT NOT NULL,
  first_name          TEXT,
  last_name           TEXT,
  phone               TEXT,
  role_keyli          user_role_keyli NOT NULL DEFAULT 'user',  -- ⚠️ corrigé en enum (était TEXT dans l'ancien schéma)
  photo_url           TEXT,
  verified            BOOLEAN DEFAULT false,
  verification_date   TIMESTAMPTZ,
  id_number           TEXT,
  id_validity_date    DATE,
  rating_avg          NUMERIC(3,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FORFAITS (remplace l'ancien enum subscription_plan_keyli — Option B actée)
-- ============================================================
CREATE TABLE plans_keyli (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                        TEXT UNIQUE NOT NULL,
  nom                         TEXT NOT NULL,
  seuil_min                   INTEGER NOT NULL,
  seuil_max                   INTEGER,
  prix_mensuel                NUMERIC(10,2) NOT NULL,
  prix_depassement_unitaire   NUMERIC(10,2),
  actif                       BOOLEAN DEFAULT true,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plans_keyli (code, nom, seuil_min, seuil_max, prix_mensuel, prix_depassement_unitaire) VALUES
  ('proprietaire',   'Propriétaire',    1,  4,    5000,  1500),
  ('agence_moyenne', 'Agence Moyenne',  5,  10,   15000, NULL),
  ('grande_agence',  'Grande Agence',   11, NULL, 25000, 1000);

-- ============================================================
-- AGENTS INTERNES (agence, sans compte de connexion séparé — décision actée)
-- ============================================================
CREATE TABLE agency_agents_keyli (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id  UUID REFERENCES auth.users(id) NOT NULL,
  nom             TEXT NOT NULL,
  actif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_user_id, nom)
);

-- ============================================================
-- COMMUNES & QUARTIERS (référence fermée — Option A actée)
-- ============================================================
CREATE TABLE communes_keyli (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quartiers_keyli (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id   UUID REFERENCES communes_keyli(id) NOT NULL,
  nom          TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(commune_id, nom)
);
CREATE INDEX idx_quartiers_commune ON quartiers_keyli(commune_id);

-- Seed — communes d'Abidjan + villes du Grand Abidjan déjà utilisées dans
-- les maquettes/PRD. Liste de départ volontairement incomplète pour les
-- quartiers (un admin en ajoute au fil de l'eau) — les 10 communes elles-
-- mêmes sont, en revanche, une liste fermée et complète dès le départ.
INSERT INTO communes_keyli (nom) VALUES
  ('Abobo'),('Adjamé'),('Attécoubé'),('Cocody'),('Koumassi'),
  ('Marcory'),('Plateau'),('Port-Bouët'),('Treichville'),('Yopougon'),
  ('Bingerville'),('Songon'),('Anyama');

INSERT INTO quartiers_keyli (commune_id, nom)
  SELECT id, quartier FROM communes_keyli, UNNEST(
    CASE nom
      WHEN 'Cocody' THEN ARRAY['Riviera','Angré','II Plateaux','Danga','Cocody Centre']
      ELSE ARRAY[nom || ' Centre']  -- placeholder de départ pour les autres communes
    END
  ) AS quartier;

-- ============================================================
-- ANNONCES
-- ============================================================
CREATE TABLE properties_keyli (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES auth.users(id) NOT NULL,
  agent_id        UUID REFERENCES agency_agents_keyli(id),
  title           TEXT NOT NULL,
  type            property_type_keyli NOT NULL,
  status          property_status_keyli NOT NULL,
  price           NUMERIC NOT NULL,
  description     TEXT,
  city            TEXT NOT NULL,
  quartier_id     UUID REFERENCES quartiers_keyli(id),
  geolocation     geography(Point, 4326),
  area_m2         NUMERIC,
  rooms           INTEGER,
  bathrooms       INTEGER,
  furnished       BOOLEAN DEFAULT false,
  video_url       TEXT,
  main_image_url  TEXT,
  is_verified     BOOLEAN DEFAULT false,
  views_count     INTEGER DEFAULT 0,
  contacts_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_properties_geolocation ON properties_keyli USING GIST (geolocation);
CREATE INDEX idx_properties_owner ON properties_keyli(owner_id);
CREATE INDEX idx_properties_agent ON properties_keyli(agent_id);
CREATE INDEX idx_properties_quartier ON properties_keyli(quartier_id);

CREATE TABLE property_media_keyli (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID REFERENCES properties_keyli(id) ON DELETE CASCADE,
  media_type   TEXT CHECK (media_type IN ('image','video')),
  url          TEXT NOT NULL,
  order_index  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VÉRIFICATION
-- ============================================================
CREATE TABLE documents_keyli (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  property_id   UUID REFERENCES properties_keyli(id),
  doc_type      document_type_keyli NOT NULL,
  file_url      TEXT NOT NULL,
  status        document_status_keyli DEFAULT 'pending',
  review_notes  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ
);

-- ============================================================
-- ABONNEMENTS & PAIEMENTS
-- ============================================================
CREATE TABLE subscriptions_keyli (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) NOT NULL,
  plan_id               UUID REFERENCES plans_keyli(id) NOT NULL,
  amount                DECIMAL(10,2) NOT NULL,
  status                subscription_status_keyli DEFAULT 'active',
  start_date            TIMESTAMPTZ NOT NULL,
  end_date              TIMESTAMPTZ NOT NULL,
  paystack_payment_id   TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions_keyli (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) NOT NULL,
  subscription_id  UUID REFERENCES subscriptions_keyli(id),
  amount           DECIMAL(10,2) NOT NULL,
  currency         TEXT DEFAULT 'XOF',
  status           transaction_status_keyli DEFAULT 'pending',
  paystack_ref     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_attempts_keyli (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID,
  email               TEXT,
  plan_type           TEXT,
  amount              NUMERIC,
  status              TEXT DEFAULT 'initiated',
  error_message       TEXT,
  paystack_reference  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTATION, MESSAGERIE, SIGNALEMENTS
-- ============================================================
CREATE TABLE ratings_keyli (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID REFERENCES properties_keyli(id) NOT NULL,
  rater_id       UUID NOT NULL,
  rated_user_id  UUID NOT NULL,
  rating         INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, rater_id)
);

CREATE TABLE messages_keyli (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user    UUID REFERENCES auth.users(id) NOT NULL,
  to_user      UUID REFERENCES auth.users(id) NOT NULL,
  property_id  UUID REFERENCES properties_keyli(id),
  body         TEXT NOT NULL,
  read         BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reports_keyli (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID REFERENCES auth.users(id) NOT NULL,
  property_id   UUID REFERENCES properties_keyli(id),
  reason        TEXT NOT NULL,
  status        report_status_keyli DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADMIN, PILOTE, MARKETING
-- ============================================================
CREATE TABLE audit_logs_keyli (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT,
  details      JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_admin ON audit_logs_keyli(admin_id);
CREATE INDEX idx_audit_created ON audit_logs_keyli(created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs_keyli(entity_type, entity_id);

CREATE TABLE feedback_keyli (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  type            TEXT CHECK (type IN ('recommendation','complaint','bug','suggestion')),
  subject         TEXT NOT NULL,
  message         TEXT NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  admin_response  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inscription_pilot_keyli (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  first_name      TEXT,
  last_name       TEXT,
  phone           TEXT,
  city            TEXT DEFAULT 'Abidjan',
  property_type   property_type_keyli,
  budget          NUMERIC,
  message         TEXT,
  status          inscription_status_keyli DEFAULT 'en_attente',
  priority_level  priority_level_keyli DEFAULT 'moyenne',
  source          TEXT DEFAULT 'pilot_landing',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE onboarding_checklists_keyli (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  step          VARCHAR(100) NOT NULL,
  completed     BOOLEAN DEFAULT false,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE marketing_templates_keyli (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  type             VARCHAR(50) NOT NULL,
  title            TEXT,
  content          TEXT NOT NULL,
  image_url        TEXT,
  target_audience  VARCHAR(100),
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE signup_attempts_keyli (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT,
  first_name     TEXT,
  last_name      TEXT,
  phone          TEXT,
  role           TEXT,
  step_reached   TEXT DEFAULT 'form_started',
  error_message  TEXT,
  user_agent     TEXT,
  completed      BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

-- ============================================================
-- PIPELINE DE LEADS & VISITES (MODULES/leads-visites.md)
-- ⚠️ Trouvé manquant lors du rescan du paquet de documentation — le
-- dashboard Agence maquetté (pipeline Nouveau→Visite→Négociation→Conclu)
-- et les "visites à venir" des dashboards Propriétaire/Agence n'avaient
-- aucune table pour les porter. messages_keyli seul ne suffit pas : il n'a
-- pas de notion de statut ni de rendez-vous programmé.
-- ============================================================
CREATE TYPE lead_stage_keyli AS ENUM ('nouveau','visite_planifiee','negociation','conclu');
CREATE TYPE visit_status_keyli AS ENUM ('planifiee','effectuee','annulee');

CREATE TABLE leads_keyli (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id        UUID REFERENCES properties_keyli(id) NOT NULL,
  owner_id           UUID REFERENCES auth.users(id) NOT NULL,  -- propriétaire ou compte agence
  agent_id           UUID REFERENCES agency_agents_keyli(id),  -- si agence, agent assigné
  contact_user_id    UUID REFERENCES auth.users(id),           -- chercheur, si compte Keyli
  contact_nom        TEXT,                                     -- si contact hors plateforme (WhatsApp, tél.)
  source_message_id  UUID REFERENCES messages_keyli(id),
  stage              lead_stage_keyli DEFAULT 'nouveau',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_leads_owner_stage ON leads_keyli(owner_id, stage);
CREATE INDEX idx_leads_agent ON leads_keyli(agent_id);

CREATE TABLE visits_keyli (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES leads_keyli(id),
  property_id     UUID REFERENCES properties_keyli(id) NOT NULL,
  scheduled_by    UUID REFERENCES auth.users(id) NOT NULL,
  visitor_user_id UUID REFERENCES auth.users(id),
  visitor_nom     TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          visit_status_keyli DEFAULT 'planifiee',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_visits_scheduled_by ON visits_keyli(scheduled_by, scheduled_at);

-- ============================================================
-- FAVORIS & ALERTES DE RECHERCHE (MODULES/annonces.md)
-- ⚠️ Également trouvées manquantes au rescan — mentionnées dans le PRD
-- (exigence Must/Should section 7.2) et dans le dashboard Chercheur
-- maquetté, sans table pour les porter.
-- ============================================================
CREATE TABLE favorites_keyli (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) NOT NULL,
  property_id  UUID REFERENCES properties_keyli(id) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

CREATE TABLE search_alerts_keyli (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID REFERENCES auth.users(id) NOT NULL,
  criteres                 JSONB NOT NULL,  -- {quartier_id, type, prix_max, rooms...} — flexible, voir DATABASE_LOGIC.md
  actif                    BOOLEAN DEFAULT true,
  derniere_notification_at TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRACKING VUES/CLICS (MODULES/analytics-tracking.md)
-- ============================================================
CREATE TABLE property_interactions_keyli (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID REFERENCES properties_keyli(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id),
  session_id        TEXT NOT NULL,
  interaction_type  interaction_type_keyli NOT NULL,
  source            TEXT,
  quartier_id       UUID REFERENCES quartiers_keyli(id),  -- copié au moment de l'événement, voir note ci-dessous
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_interactions_property ON property_interactions_keyli(property_id, created_at DESC);
CREATE INDEX idx_interactions_type_date ON property_interactions_keyli(interaction_type, created_at DESC);
CREATE INDEX idx_interactions_quartier ON property_interactions_keyli(quartier_id, interaction_type, created_at DESC);
-- quartier_id est copié depuis properties_keyli.quartier_id au moment de
-- l'écriture (pas récupéré par jointure a posteriori) — si une annonce
-- change de quartier plus tard, l'historique de tendance ne doit pas se
-- corrompre rétroactivement. Avec une référence fermée (Option A), une
-- jointure aurait pu sembler plus simple, mais casserait cette garantie.

CREATE OR REPLACE FUNCTION fn_after_property_interaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interaction_type = 'view' THEN
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

-- ============================================================
-- ⚠️ ROW-LEVEL SECURITY — ACTIVÉE ICI, POLICIES NON ÉCRITES
-- ============================================================
-- Activer RLS SANS policy bloque tout accès (fail closed), y compris pour
-- le propriétaire des données. NE PAS déployer cette migration en
-- production tant que les policies de chaque table n'ont pas été écrites
-- juste après (une policy par rôle/action, voir ROLES.md). Activé ici pour
-- que RLS soit "on" dès la création des tables, jamais ajouté après coup.
ALTER TABLE profiles_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_media_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE communes_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE quartiers_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_agents_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscription_pilot_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklists_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_templates_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_attempts_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_interactions_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites_keyli ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_alerts_keyli ENABLE ROW LEVEL SECURITY;

-- Policies minimales de démarrage (à compléter — voir ROLES.md pour le détail par rôle) :
CREATE POLICY "Lecture publique des forfaits actifs" ON plans_keyli FOR SELECT USING (actif = true);
CREATE POLICY "Lecture publique des communes" ON communes_keyli FOR SELECT USING (true);
CREATE POLICY "Lecture publique des quartiers" ON quartiers_keyli FOR SELECT USING (true);
CREATE POLICY "Lecture publique des annonces vérifiées" ON properties_keyli FOR SELECT USING (true);
CREATE POLICY "Propriétaire gère ses annonces" ON properties_keyli FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Lecture publique des notes" ON ratings_keyli FOR SELECT USING (true);
CREATE POLICY "Insertion tracking ouverte (anonyme inclus)" ON property_interactions_keyli FOR INSERT WITH CHECK (true);
CREATE POLICY "Propriétaire/agence gère ses leads" ON leads_keyli FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Propriétaire/agence gère ses visites" ON visits_keyli FOR ALL USING (auth.uid() = scheduled_by);
CREATE POLICY "Utilisateur gère ses favoris" ON favorites_keyli FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Utilisateur gère ses alertes" ON search_alerts_keyli FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Utilisateur lit et modifie son propre profil" ON profiles_keyli FOR ALL USING (auth.uid() = user_id);
-- ⚠️ profiles_keyli est la seule table dont la policy est URGENTE dès le
-- Sprint 1 (pas "avant mise en production" comme les autres ci-dessous) :
-- sans elle, un utilisateur ne peut même pas lire son propre profil après
-- inscription — ça bloque le tout premier parcours testable.
-- Toutes les autres policies (documents, messages, admin, etc.) restent à écrire
-- table par table avant la mise en production — cette migration ne les invente pas.
