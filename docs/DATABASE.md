# Keyli — Structure de la base de données (Supabase / PostgreSQL)

## ⚠️ DÉCISION ACTÉE : nouveau compte Supabase, schéma reconstruit de zéro

Le schéma décrit ci-dessous est **l'ancien schéma**, celui de l'implémentation
pilote actuelle — il est conservé dans ce document comme référence
(nommage des colonnes, logique métier déjà validée) mais **n'est pas repris
tel quel** dans le nouveau projet. Le nouveau schéma part de zéro sur un
nouveau compte Supabase, avec PostGIS activé dès la première migration (voir
MODULES/geolocalisation.md) et les 5 écarts listés dans MODULES/README.md
corrigés par construction plutôt que migrés.

**Ce que Claude Code doit faire avec ce document** : s'en servir comme
référence de nommage et de logique métier (quelles colonnes existent,
quelles règles s'y appliquent), PAS comme script de migration à rejouer tel
quel. Toute nouvelle migration doit repartir d'un schéma propre : tables
suffixées `_keyli` uniquement dès la première migration (pas de version
non suffixée créée puis corrigée), enums corrects dès le départ (voir
l'écart `subscription_plan_keyli` ci-dessous — à corriger dans le schéma
neuf, pas migré depuis l'ancien).

---

Ce document reflète le schéma réel extrait des migrations existantes
(`supabase/migrations/*.sql`) au moment de la rédaction — pas un schéma
théorique. Toute colonne non listée ici n'est pas confirmée : vérifier la
migration correspondante avant de s'appuyer dessus.

## ⚠️ Dette technique — tables et enums en double, NE PAS UTILISER les non suffixés

Les premières migrations (septembre 2025) ont créé deux jeux parallèles.
**Seuls les noms suffixés `_keyli` sont canoniques.**

| Non suffixé (LEGACY — ne jamais utiliser) | Canonique (`_keyli`) |
|---|---|
| `properties` | `properties_keyli` |

| `property_media` | `property_media_keyli` |
| `document_status` (enum) | `document_status_keyli` (enum) |
| `document_type` (enum) | `document_type_keyli` (enum) |
| `property_status` (enum) | `property_status_keyli` (enum) |
| `property_type` (enum) | `property_type_keyli` (enum) |
| `report_status` (enum) | `report_status_keyli` (enum) |
| `subscription_plan` (enum) | `subscription_plan_keyli` (enum) |
| `subscription_status` (enum) | `subscription_status_keyli` (enum) |
| `transaction_status` (enum) | `transaction_status_keyli` (enum) |

Note : `subscription_plan_keyli` figure ici comme référence historique de
nommage — dans le nouveau schéma, il est en plus **remplacé** par la table
`plans_keyli` (voir plus bas), pas seulement renommé.

Action requise avant la Phase 0 du calendrier de développement : migration de
nettoyage qui supprime (ou renomme en `_deprecated`) les objets non suffixés,
après vérification qu'aucune donnée réelle n'y est stockée. Claude Code ne
doit ni lire ni écrire sur les objets non suffixés, même s'ils apparaissent
dans l'auto-complétion des types générés.

## Enums canoniques
```sql
user_role_keyli            ('user','owner','agency','admin')
property_type_keyli        ('maison','duplex','villa','appartement','studio',
                             'residence_meublee','auberge','hotel','bureau','magasin')
property_status_keyli      ('a_louer','a_vendre')
document_type_keyli        ('acd','registre','extrait_naissance','cert_residence')
document_status_keyli      ('pending','approved','rejected')
subscription_status_keyli  ('active','expired','canceled')
transaction_status_keyli   ('pending','completed','failed')
report_status_keyli        ('pending','reviewed','resolved')
inscription_status_keyli   ('en_attente','contacte','converti','rejete')
priority_level_keyli       ('haute','moyenne','basse')
```
`subscription_plan_keyli` (ancien enum `owner_agency`/`basic_user`) est
**remplacé par la table `plans_keyli`** dans le nouveau schéma — voir
section "Tables à créer" plus bas pour le schéma complet et les 3 forfaits.
Ne pas recréer cet enum sur le nouveau projet.

## Tables principales (colonnes confirmées dans les migrations)

### profiles_keyli
```sql
id                  UUID PK
user_id             UUID REFERENCES auth.users(id) UNIQUE NOT NULL
email               TEXT NOT NULL
first_name          TEXT
last_name           TEXT
phone               TEXT
role_keyli          TEXT DEFAULT 'user'   -- ⚠️ TEXT, pas user_role_keyli — incohérence à vérifier
photo_url           TEXT
verified            BOOLEAN DEFAULT false
verification_date   TIMESTAMPTZ
id_number           TEXT
id_validity_date    DATE
rating_avg          NUMERIC(3,2) DEFAULT 0
created_at / updated_at
```

### properties_keyli
```sql
id              UUID PK
owner_id        UUID REFERENCES auth.users(id)
title           TEXT NOT NULL
type            property_type_keyli NOT NULL
status          property_status_keyli NOT NULL
price           NUMERIC NOT NULL
description     TEXT
city            TEXT NOT NULL
neighborhood    TEXT
geolocation     POINT
area_m2         NUMERIC
rooms           INTEGER
bathrooms       INTEGER
furnished       BOOLEAN DEFAULT false
video_url       TEXT
main_image_url  TEXT
is_verified     BOOLEAN DEFAULT false
created_at / updated_at
```
⚠️ Dans l'ancien schéma, `geolocation` était un `POINT` PostgreSQL natif,
sans extension géospatiale (ni PostGIS ni earthdistance/cube) — recherche
par rayon impossible. **Décision actée pour le nouveau schéma** : PostGIS
activé dès la première migration, `geolocation geography(Point, 4326)` avec
index GiST — voir MODULES/geolocalisation.md avant tout code de recherche
géographique par distance.
Champ `neighborhood` (TEXT libre) — c'était la colonne de l'ancien schéma.
**Décision actée pour le nouveau schéma (Option A)** : remplacé par
`quartier_id` (FK vers `quartiers_keyli`, lui-même rattaché à
`communes_keyli`) — voir section "Décisions actées" plus bas et
`reference/schema_cible_reference.sql` pour le schéma complet avec seed.

### property_media_keyli
```sql
id           UUID PK
property_id  UUID REFERENCES properties_keyli(id)
media_type   TEXT CHECK IN ('image','video')
url          TEXT NOT NULL
order_index  INTEGER DEFAULT 0
created_at
```

### documents_keyli
```sql
id            UUID PK
user_id       UUID REFERENCES auth.users(id)
property_id   UUID REFERENCES properties_keyli(id) NULL
doc_type      document_type_keyli NOT NULL
file_url      TEXT NOT NULL
status        document_status_keyli DEFAULT 'pending'
review_notes  TEXT
created_at / reviewed_at
```

### subscriptions_keyli
```sql
id                    UUID PK
user_id               UUID REFERENCES auth.users(id)
plan_id               UUID REFERENCES plans_keyli(id) NOT NULL   -- voir section "Tables à créer" plus bas
amount                DECIMAL(10,2) NOT NULL
status                subscription_status_keyli DEFAULT 'active'
start_date            TIMESTAMPTZ NOT NULL
end_date              TIMESTAMPTZ NOT NULL
paystack_payment_id   TEXT
created_at / updated_at
```

### transactions_keyli
```sql
id               UUID PK
user_id          UUID REFERENCES auth.users(id)
subscription_id  UUID REFERENCES subscriptions_keyli(id) NULL
amount           DECIMAL(10,2) NOT NULL
currency         TEXT DEFAULT 'XOF'
status           transaction_status_keyli DEFAULT 'pending'
paystack_ref     TEXT
created_at
```

### ratings_keyli
```sql
id             UUID PK
property_id    UUID REFERENCES properties_keyli(id)
rater_id       UUID NOT NULL
rated_user_id  UUID NOT NULL
rating         INTEGER CHECK (1-5)
comment        TEXT
created_at / updated_at
UNIQUE(property_id, rater_id)   -- une seule note par utilisateur par bien
```

### messages_keyli
```sql
id           UUID PK
from_user    UUID REFERENCES auth.users(id)  -- ⚠️ FK vers profiles(user_id), pas profiles_keyli — à vérifier
to_user      UUID REFERENCES auth.users(id)
property_id  UUID REFERENCES properties_keyli(id)
body         TEXT NOT NULL
read         BOOLEAN DEFAULT false
created_at
```

### reports_keyli
```sql
id            UUID PK
reporter_id   UUID REFERENCES auth.users(id)
property_id   UUID REFERENCES properties_keyli(id)
reason        TEXT NOT NULL
status        report_status_keyli DEFAULT 'pending'
created_at / updated_at
```

### audit_logs_keyli
```sql
id           UUID PK
admin_id     UUID NOT NULL
action       TEXT NOT NULL
entity_type  TEXT NOT NULL   -- 'document' | 'property' | 'user' | 'report' | 'subscription'
entity_id    TEXT
details      JSONB DEFAULT '{}'
created_at
INDEX (admin_id) / (created_at DESC) / (entity_type, entity_id)
```

### feedback_keyli
```sql
id              UUID PK
user_id         UUID NOT NULL
type            TEXT CHECK IN ('recommendation','complaint','bug','suggestion')
subject         TEXT NOT NULL
message         TEXT NOT NULL
status          TEXT DEFAULT 'pending' CHECK IN ('pending','reviewed','resolved','dismissed')
admin_response  TEXT
created_at / updated_at
```

### inscription_pilot_keyli
```sql
id              UUID PK
email           TEXT UNIQUE NOT NULL
first_name / last_name / phone
city            TEXT DEFAULT 'Abidjan'
property_type   property_type_keyli
budget          NUMERIC
message         TEXT
status          inscription_status_keyli DEFAULT 'en_attente'
priority_level  priority_level_keyli DEFAULT 'moyenne'
source          TEXT DEFAULT 'pilot_landing'
created_at / updated_at
```

### onboarding_checklists_keyli
```sql
id            UUID PK
user_id       UUID REFERENCES auth.users(id)
step          VARCHAR(100) NOT NULL
completed     BOOLEAN DEFAULT false
completed_at  TIMESTAMPTZ
notes         TEXT
created_at / updated_at
```

### marketing_templates_keyli
```sql
id               UUID PK
name             VARCHAR(255) NOT NULL
type             VARCHAR(50) NOT NULL  -- 'whatsapp' | 'facebook' | 'instagram'
title            TEXT
content          TEXT NOT NULL
image_url        TEXT
target_audience  VARCHAR(100)
created_by       UUID REFERENCES auth.users(id)
created_at / updated_at
```

### signup_attempts_keyli
```sql
id             UUID PK
email / first_name / last_name / phone / role   TEXT
step_reached   TEXT DEFAULT 'form_started'
error_message  TEXT
user_agent     TEXT
completed      BOOLEAN DEFAULT false
created_at / completed_at
```
Table de l'ancien schéma pour le tracking d'entonnoir d'inscription,
reprise dans le schéma neuf avec ce seul rôle. Le tracking des recherches
par quartier (PRD 7.2) ne s'appuie PAS dessus : source actée =
`property_interactions_keyli` (voir MODULES/analytics-tracking.md).

### payment_attempts_keyli
```sql
id                 UUID PK
user_id            UUID
email              TEXT
plan_type          TEXT
amount             NUMERIC
status             TEXT DEFAULT 'initiated'
error_message      TEXT
paystack_reference TEXT
created_at
```

## Row-Level Security
RLS activée sur toutes les tables listées. Policies exactes non reproduites
ici — vérifier `supabase/migrations/*.sql` avant toute modification de policy,
ne jamais assumer une policy par défaut de type "propriétaire uniquement" sans
vérifier (ex. `ratings_keyli` a une policy `SELECT` publique intentionnelle :
"Anyone can view ratings").

## Tables à créer (n'existent pas encore)
- Extension PostGIS activée dès la première migration du nouveau projet
  (décision actée, voir MODULES/geolocalisation.md) — `geolocation` devient
  `geography(Point, 4326)` avec index GiST dès la création de la table,
  jamais un `POINT` legacy.
- `property_interactions_keyli` (tracking vues/clics) — voir
  MODULES/analytics-tracking.md, schéma complet déjà spécifié.

## ⚠️ DÉCISION ACTÉE (2026-09-28) — sécurité de profiles_keyli
La policy `FOR ALL USING (auth.uid() = user_id)` du schéma de référence
laissait un utilisateur modifier son propre `role_keyli` (→ `admin`),
`verified` ou `rating_avg`. Remplacée, dans la migration
`20260928120100_profiles_keyli.sql`, par :
- **Création par trigger** `on_auth_user_created_keyli` (fonction
  `handle_new_user_keyli`, SECURITY DEFINER) à chaque insertion dans
  `auth.users`. Métadonnées lues dans `options.data` du signUp :
  `role_keyli`, `first_name`, `last_name`, `phone`. Seuls `user`, `owner`,
  `agency` sont acceptés ; `admin` ou rôle inconnu → l'inscription échoue ;
  rôle absent → `user`.
- **Lecture** : son propre profil uniquement (aucune lecture publique pour
  l'instant — à décider avec annonces/notation, sans jamais exposer email,
  téléphone ni pièce d'identité).
- **Modification** : son propre profil, et seulement `first_name`,
  `last_name`, `phone`, `photo_url` (privilèges par colonne). `role_keyli`,
  `verified`, `verification_date`, `rating_avg`, `email`, `id_number`,
  `id_validity_date` : serveur uniquement (Edge Function ou admin).
- **Aucun INSERT/DELETE** côté client. `anon` n'a aucun droit sur la table.
- Création d'un admin : SQL direct uniquement (seul chemin d'élévation de
  rôle tant qu'un back-office dédié n'est pas décidé, voir MODULES/auth.md).
- `updated_at` mis à jour par le trigger générique `set_updated_at_keyli()`,
  à réutiliser sur les prochaines tables.
Tests : `supabase/tests/profiles_keyli_rls.test.sql` (pgTAP, rejoués en CI).

## ⚠️ DÉCISION ACTÉE — plans_keyli remplace subscription_plan_keyli (Option B)
```sql
CREATE TABLE plans_keyli (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                        TEXT UNIQUE NOT NULL,   -- 'proprietaire' | 'agence_moyenne' | 'grande_agence'
  nom                         TEXT NOT NULL,
  seuil_min                   INTEGER NOT NULL,
  seuil_max                   INTEGER,                -- NULL = illimité (aucun forfait depuis le 2026-10-01 : grande agence = 30)
  prix_mensuel                NUMERIC(10,2) NOT NULL,
  prix_depassement_unitaire   NUMERIC(10,2),           -- prix par annonce au-delà du seuil
  actif                       BOOLEAN DEFAULT true,
  created_at / updated_at
);

-- subscriptions_keyli.plan (actuellement subscription_plan_keyli) devient :
ALTER TABLE subscriptions_keyli
  DROP COLUMN plan,  -- ⚠️ sur le nouveau schéma uniquement — pas de migration de données existantes
  ADD COLUMN plan_id UUID REFERENCES plans_keyli(id) NOT NULL;
```
Données à insérer dès la migration (seed, voir PRD section 11.1) :
```sql
INSERT INTO plans_keyli (code, nom, seuil_min, seuil_max, prix_mensuel, prix_depassement_unitaire) VALUES
  ('proprietaire',    'Propriétaire',    1,  4,    5000,  1500),
  ('agence_moyenne',  'Agence Moyenne',  5,  10,   15000, NULL),  -- pas de dépassement unitaire, palier fixe
  ('grande_agence',   'Grande Agence',   11, NULL, 25000, 1000);
-- ⚠️ seuil_max de grande_agence passé à 30 le 2026-10-01 (décision du porteur
-- de projet, migration 20261001140000_plafond_grande_agence_keyli.sql)
```
`subscription_plan_keyli` (l'enum) n'est plus utilisé dans le nouveau schéma
— ne pas le recréer par réflexe de cohérence avec l'ancien.

**Créée le 2026-10-01** (migration `20261001120000_plans_keyli.sql`, seed
inclus). Accès : lecture publique (`anon` + `authenticated`) des seuls
forfaits `actif = true` ; aucune écriture côté client (privilèges retirés)
— modification par SQL direct ou future Edge Function admin. L'accès d'un
abonné à un forfait désactivé depuis sa souscription sera ouvert avec
`subscriptions_keyli`. Tests : `supabase/tests/plans_keyli_rls.test.sql`.

## ⚠️ DÉCISION ACTÉE — agents internes à l'agence (pas de compte séparé)
Un seul compte de connexion par agence (`role_keyli = 'agency'`) — les agents
ne se connectent jamais individuellement. Une petite table de référence,
pas un champ texte libre (même erreur que `neighborhood` à éviter) :
```sql
CREATE TABLE agency_agents_keyli (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id  UUID REFERENCES auth.users(id) NOT NULL,
  nom             TEXT NOT NULL,
  actif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_user_id, nom)
);

ALTER TABLE properties_keyli ADD COLUMN agent_id UUID REFERENCES agency_agents_keyli(id) NULL;
```
Le tableau "Performance de l'équipe" du dashboard Agence (dashboard.md)
devient une jointure `properties_keyli.agent_id → agency_agents_keyli`,
agrégée par agent — pas un système d'authentification séparé, pas de RLS
supplémentaire (le compte agence reste seul propriétaire de ses données).
`agent_id` est nullable : une annonce peut rester non attribuée à un agent
précis.

## ⚠️ DÉCISION ACTÉE — communes_keyli / quartiers_keyli (Option A, normalisation)
`neighborhood` (TEXT libre) remplacé par une hiérarchie fermée à deux
niveaux — corrige à la fois le risque de variantes orthographiques et la
confusion commune/quartier déjà présente dans les maquettes (Cocody =
commune, Riviera/Angré = quartiers de Cocody) :
```sql
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

ALTER TABLE properties_keyli
  DROP COLUMN neighborhood,  -- ⚠️ nouveau schéma uniquement, pas de migration de données existantes
  ADD COLUMN quartier_id UUID REFERENCES quartiers_keyli(id);
```
Seed de départ : les 10 communes d'Abidjan + Bingerville/Songon/Anyama
(liste fermée et complète dès le départ) ; quartiers détaillés uniquement
pour Cocody au lancement (Riviera, Angré, II Plateaux, Danga, Cocody Centre),
un quartier générique "`<Commune>` Centre" pour les autres — liste des
quartiers volontairement incomplète, à enrichir par un admin au fil de l'eau.
Voir `reference/schema_cible_reference.sql` pour le seed SQL complet.

Ne jamais laisser un formulaire de publication d'annonce créer un nouveau
quartier à la volée — la liste reste fermée par design (voir
MODULES/quartiers-tendance.md).

**Créées le 2026-10-01** (migration
`20261001130000_communes_quartiers_keyli.sql`, seed inclus : 13 communes,
17 quartiers). Accès : lecture publique (`anon` + `authenticated`) ; aucune
écriture côté client (privilèges retirés) — ajout de quartiers par SQL
direct ou future Edge Function admin. Tests :
`supabase/tests/communes_quartiers_keyli_rls.test.sql`.


