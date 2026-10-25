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
rappel_j7_pour        TIMESTAMPTZ   -- échéance pour laquelle le rappel J-7 est parti (2026-10-25)
rappel_j1_pour        TIMESTAMPTZ   -- idem J-1
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

**Créée le 2026-10-01** (migration `20261001150000_agency_agents_keyli.sql`).
Accès : une agence lit, crée, renomme et désactive SES agents ; création et
modification réservées au rôle `agency` ; aucune suppression (un agent qui
part est désactivé, `actif = false`, pour garder l'historique) ;
`agency_user_id` non modifiable après création. Fonction
`current_user_role_keyli()` (SECURITY DEFINER) introduite pour les policies
par rôle — réutilisable. Tests : `supabase/tests/agency_agents_keyli_rls.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-02) — properties_keyli / property_media_keyli
Créées le 2026-10-02 (migration `20261002130000_properties_keyli.sql`), avec
les enums `property_type_keyli` et `property_status_keyli`. Écarts avec le
schéma de référence :
- **`archived_at TIMESTAMPTZ`** (nouvelle colonne) : NULL = publiée,
  renseignée = archivée. Une annonce n'est jamais supprimée.
- **`geolocation geography(Point, 4326) NOT NULL`** : point GPS obligatoire
  (MODULES/geolocalisation.md).
- Index de recherche composite `idx_properties_recherche (quartier_id, type,
  price)` à la place de l'index simple sur `quartier_id` (qu'il couvre).
- Index `idx_property_media_property (property_id, order_index)`.
Accès :
- Lecture publique de toute annonce non archivée, vérifiée ou non ; le
  propriétaire voit aussi ses archivées. Médias visibles si l'annonce l'est.
- Publication et modification : rôles `owner` et `agency`, pour leur propre
  compte ; `agent_id` doit appartenir à l'agence qui publie.
- Non modifiables par le client : `is_verified` (admin), `views_count`,
  `contacts_count` (trigger analytics), `main_image_url` (trigger
  `sync_main_image_keyli`), `owner_id` après création. Aucune suppression
  d'annonce ; un média, lui, peut être retiré.
- Pas encore appliqué (tables manquantes) : limite du forfait à la
  publication, registre de commerce obligatoire pour une agence.
Tests : `supabase/tests/properties_keyli_rls.test.sql`.

## ⚠️ DÉCISION ACTÉE (2026-10-22) — nom de l'agence (raison sociale)
Migration `20261022120000_nom_agence_keyli.sql`. Nouvelle colonne
`profiles_keyli.nom_agence TEXT` :
- **Obligatoire à l'inscription d'une agence** (`options.data.nom_agence` du
  signUp ; sinon l'inscription échoue, code 22023) ; ignoré pour les autres
  rôles.
- Modifiable par l'agence tant qu'elle n'est pas vérifiée ; jamais vide ;
  **figé après vérification** (trigger `controler_nom_agence_keyli`, refus
  42501) — seul un admin le corrige via `admin_modifier_nom_agence_keyli(user,
  nom, motif)`, journalisé.
- Le profil public d'une agence affiche ce nom (`profils_publics_keyli`).
Tests : `supabase/tests/nom_agence_keyli.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-21) — retrait de vérification et suspension de compte
Migration `20261021120000_moderation_comptes_keyli.sql`. Décisions du porteur
de projet :
- **Nouvelles colonnes `profiles_keyli`** : `suspendu BOOLEAN NOT NULL DEFAULT
  false`, `suspension_fin TIMESTAMPTZ` (NULL = indéfinie), `suspension_motif
  TEXT` — jamais modifiables par le client. `compte_actif_keyli(user)` : une
  suspension dont la date de fin est passée est levée d'elle-même.
- **Retrait de vérification** (admin, motif obligatoire) :
  `admin_retirer_verification_compte_keyli(user, motif)` → `verified = false`,
  pièces approuvées (extrait, certificat, registre) passées « rejetées » avec le
  motif ; `admin_retirer_verification_bien_keyli(bien, motif)` →
  `is_verified = false`, ACD passé « rejeté ». Le compte redépose ses pièces.
- **Suspension** (admin, motif obligatoire ; un admin ou super_admin ne l'est
  que par le super_admin ; jamais soi-même) :
  `admin_suspendre_compte_keyli(user, motif, fin facultative)` et
  `admin_reactiver_compte_keyli(user, note)`. Effets : connexion bloquée
  (`auth.users.banned_until` = date de fin, ou + 100 ans si indéfinie),
  annonces masquées au public (pas archivées), **écritures bloquées même avec
  une session ouverte** — policies RESTRICTIVES « Compte suspendu : … » sur
  toutes les tables où un utilisateur écrit et sur `storage.objects`.
- Notifications : nouveaux types `verification_retiree`, `compte_suspendu`,
  `compte_reactive` (avec le motif). Toutes les actions sont journalisées.
Tests : `supabase/tests/moderation_comptes_keyli.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-06) — quartiers tendance
Migration `20261006120000_quartiers_tendance_keyli.sql`. Décisions du porteur
de projet : popularité = sessions distinctes ayant cherché le quartier OU vu
une de ses annonces ; fenêtre 30 jours, prix comparés aux 30 jours précédents ;
recalcul chaque nuit ; repli sur la commune sous 5 annonces.
- **`quartiers_tendance_keyli`** (nouvelle table, instantané) : une ligne par
  quartier et par commune (`niveau`, `zone_id`, `commune_id`, `nom`) ;
  `score_popularite`, `sessions_recherche`, `sessions_vue` ; prix séparés
  **location / vente** (`nb_*`, `prix_moyen_*`, `prix_moyen_*_prec`,
  `tendance_*_pct`) — une moyenne mêlant loyers et prix de vente n'aurait pas
  de sens ; `prix_fiable` (≥ 5 mises en ligne sur la période) ; période et
  date de calcul. Lecture publique, aucune écriture client.
- Calcul `calculer_quartiers_tendance_keyli()` (remplace l'instantané) :
  popularité depuis `property_interactions_keyli` (quartier copié à
  l'événement), prix depuis `property_publications_keyli` (republications
  comprises). Planifié par **pg_cron** (`keyli-quartiers-tendance`, 02:00
  UTC = Abidjan) et exécuté une fois à la migration.
- Vues : `quartiers_populaires_keyli` (chips de l'Accueil, par score — le
  nombre affiché est un réglage d'écran) et `tendances_prix_keyli` (TrendBar :
  le quartier s'il est fiable, sinon sa commune).
Tests : `supabase/tests/quartiers_tendance_keyli.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-05) — notifications in-app et alertes de recherche
Migration `20261005140000_notifications_alertes_keyli.sql`. Décisions du
porteur de projet : notification immédiate dans l'application ; critères =
filtres de recherche + rayon ; au plus 10 notifications par alerte et par jour.
- **`notifications_keyli`** (nouvelle table, générique) : id, user_id, type
  (CHECK, aujourd'hui `alerte_recherche` — liste à étendre : messages,
  vérification, expiration…), titre, contenu, property_id, alert_id, lue,
  created_at. Lecture et « lue » par son titulaire ; création par le serveur
  uniquement (triggers, Edge Functions). Index : non lues, par date, par
  alerte.
- **Critères d'alerte validés** (`criteres_alerte_valides_keyli`, CHECK sur
  `search_alerts_keyli.criteres`) : clés `commune_id`, `quartier_id` (uuid),
  `type`, `status`, `prix_min`, `prix_max`, `rooms_min` (≥ 0), `furnished`
  (booléen), `lat` + `lng` + `rayon_km` (ensemble, rayon 0,1 à 50 km) ;
  toute autre clé est refusée.
- **Déclenchement** : trigger `notifier_alertes_keyli` à la publication et à
  la republication d'une annonce ; correspondance par
  `annonce_correspond_alerte_keyli` (rayon via PostGIS) ; jamais pour sa
  propre annonce ni pour une alerte désactivée ; plafond de 10 par alerte et
  par jour ; `derniere_notification_at` mise à jour. Contenu : « titre —
  350 000 XOF ».
- Reste : l'email (Edge Function, fournisseur à choisir) et le push mobile
  (Phase 3). Le parcours de toutes les alertes actives à chaque publication
  convient au pilote ; à revoir si le volume d'alertes grossit fortement.
Tests : `supabase/tests/notifications_alertes_keyli.test.sql`.

## ⚠️ DÉCISION ACTÉE (2026-10-05) — notation après visite ou lead conclu
Migration `20261005130000_notation_apres_visite_keyli.sql` (remplace la règle
provisoire « échange de messages » du 2026-10-02) :
- On note, dans les deux sens, seulement après une **visite effectuée** OU un
  **lead conclu** entre les deux personnes sur ce bien (fonction
  `relation_notable_keyli(bien, autre)`, SECURITY DEFINER, qui ne renseigne
  que sur l'appelant).
- Unicité `ratings_keyli_une_note_par_personne (property_id, rater_id,
  rated_user_id)` au lieu de `UNIQUE(property_id, rater_id)` : un
  propriétaire note chacun de ses locataires successifs, une fois chacun.
Tests : `supabase/tests/notation_apres_visite_keyli.test.sql`.

## ⚠️ DÉCISION ACTÉE (2026-10-05) — profil public (vue profils_publics_keyli)
Migration `20261005120000_profils_publics_keyli.sql`. `profiles_keyli` reste
lisible par son seul titulaire (et l'admin) ; le public passe par la vue
`profils_publics_keyli` (lecture seule, visiteurs compris) :
- `user_id`, `nom_affiche`, `photo_url`, `role_keyli`, `verified`,
  `rating_avg`, `membre_depuis` (= `created_at`).
- `nom_affiche` : particulier → « Prénom I. » (initiale du nom) ; agence →
  nom complet ; sans nom → « Membre Keyli » / « Agence Keyli ».
- Jamais : email, téléphone, n° / validité de pièce, date de vérification,
  nom de famille brut. Comptes admin et super_admin exclus.
- Vue en `security_invoker = false` : c'est elle qui fait le tri des colonnes.
Depuis le 2026-10-22, une agence s'affiche sous son `nom_agence` (voir plus haut).
Tests : `supabase/tests/profils_publics_keyli.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-05) — property_interactions_keyli
Créée le 2026-10-05 (migration `20261004120000_interactions_keyli.sql`), avec
l'enum `interaction_type_keyli`. Colonnes et index du schéma de référence,
plus :
- CHECK : `session_id` de 8 à 100 caractères ; `source` parmi search / map /
  recommandation / lien_direct / quartier_tendance ; un événement porte sur
  une annonce, sauf `search_neighborhood` qui porte sur un quartier
  (`quartier_id` obligatoire). Index `idx_interactions_session_vue`
  (anti-inflation).
- Trigger `preparer_interaction_keyli` : `user_id` imposé (utilisateur
  connecté, NULL si anonyme), `created_at` = now(), `quartier_id` **copié
  depuis l'annonce** au moment de l'événement (jamais celui envoyé par le
  client quand une annonce est concernée).
- Trigger `compter_interaction_keyli` : `views_count` (pas de recomptage d'une
  même session sur un même bien avant 30 min) et `contacts_count`
  (click_contact / click_phone / click_whatsapp).
- Le trigger `updated_at` de `properties_keyli` ne réagit plus qu'aux vraies
  modifications (liste de colonnes) : une vue ou un contact compté ne change
  pas la « dernière activité » d'une annonce.
- Accès : écriture ouverte (visiteurs compris) sur une annonce visible ;
  lecture par le propriétaire du bien et l'admin ; aucune lecture publique.
Reste : webhook `process-interaction-webhook` (Dashboard) et calcul de
tendance (MODULES/quartiers-tendance.md, non tranché).
Tests : `supabase/tests/interactions_keyli.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-03) — favorites_keyli / search_alerts_keyli
Créées le 2026-10-03 (migration `20261003130000_favoris_alertes_keyli.sql`).
Colonnes du schéma de référence, plus :
- `favorites_keyli` : bascule — ajout sur une annonce visible (publiée, ou
  la sienne), retrait par suppression (second clic) ; privés à leur
  titulaire ; `UNIQUE(user_id, property_id)`.
- `search_alerts_keyli` : CHECK `criteres` = objet JSON non vide ; index
  `idx_search_alerts_user_actif (user_id, actif)` ; l'utilisateur crée,
  modifie, désactive / réactive ses alertes, jamais de suppression ;
  `derniere_notification_at` réservée au serveur. Mécanisme de notification
  toujours à trancher (MODULES/annonces.md).
Tests : `supabase/tests/favoris_alertes_keyli.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-03) — leads_keyli / visits_keyli
Créées le 2026-10-03 (migration `20261003120000_leads_visites_keyli.sql`), avec
les enums `lead_stage_keyli` et `visit_status_keyli`. Colonnes et index du
schéma de référence, plus :
- **Lead automatique** au premier message d'un chercheur au sujet d'une
  annonce (trigger `creer_lead_au_contact_keyli` sur `messages_keyli`) ; un
  seul lead par chercheur et par annonce (index unique partiel
  `uq_leads_keyli_contact_annonce`).
- **`owner_id` recopié de l'annonce** par le trigger `coherence_lead_keyli`
  (jamais saisi par le client) ; `agent_id` doit appartenir à ce compte.
- CHECK : un lead a un contact identifié (`contact_user_id` ou
  `contact_nom`) ; une visite a un visiteur identifié.
- Lead manuel : contact hors plateforme uniquement (`contact_user_id` non
  saisissable par le client).
- Visite : sur l'une de ses annonces ; lead éventuel du même bien ; visiteur
  avec compte = quelqu'un qui a écrit au propriétaire sur ce bien.
- **Aucune suppression** de lead ni de visite (visite annulée conservée).
- Lecture : le propriétaire/agence ses leads et visites ; l'admin tout ; le
  chercheur ne voit pas l'état commercial de son contact.
Tests : `supabase/tests/leads_visites_keyli.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-02) — module admin
Migrations `20261002180000_admin_fondations_keyli.sql` et
`20261002190000_admin_backoffice_keyli.sql`. Décisions du porteur de projet :
- **Actions sensibles = fonctions SQL (RPC)** qui vérifient le rôle,
  exécutent l'action et écrivent l'audit dans la même transaction
  (remplacent les Edge Functions prévues pour ces actions). Aucun privilège
  d'écriture directe pour les admins sur les tables sensibles.
  - `admin_reviser_document_keyli(document, decision, notes)` (admin) :
    seulement un document `pending` ; ACD approuvé → `properties_keyli.is_verified` ;
    propriétaire vérifié = extrait_naissance ET cert_residence approuvés ;
    agence vérifiée = registre approuvé (`profiles_keyli.verified`,
    `verification_date`).
  - `admin_traiter_signalement_keyli(report, statut, note)` (admin).
  - `super_admin_changer_role_keyli(user, role)` : nomme / retire les admins ;
    jamais `super_admin` (SQL direct uniquement), jamais son propre rôle ni
    celui d'un super_admin.
  - `super_admin_modifier_forfait_keyli(...)` et
    `super_admin_formule_negociee_keyli(...)` (avant/après dans l'audit).
- Fonctions de rôle `est_admin_keyli()` (admin ou super_admin) et
  `est_super_admin_keyli()`.
- **`audit_logs_keyli`** (colonnes et index du schéma de référence) : écrit
  uniquement par les fonctions d'action (`journaliser_keyli`, interne) ;
  un admin lit ses propres entrées, le super_admin lit tout ; aucune
  modification ni suppression.
- **Lecture admin** ajoutée sur profils, annonces (archivées comprises),
  médias, agents, documents (+ fichiers du bucket), abonnements,
  transactions, tentatives, mises en ligne, signalements, forfaits
  désactivés. Les messages privés restent inaccessibles à l'admin.
- **Back-office** (colonnes du schéma de référence, enums
  `inscription_status_keyli`, `priority_level_keyli`) — écriture admin directe,
  actions non sensibles :
  - `feedback_keyli` : l'utilisateur envoie et lit ses retours ; l'admin lit
    tout et répond (`status`, `admin_response`).
  - `inscription_pilot_keyli` : formulaire public (visiteurs compris), statut
    et priorité par défaut ; lecture et suivi par l'admin.
  - `onboarding_checklists_keyli` : étapes posées par l'admin, cochées par
    l'utilisateur.
  - `marketing_templates_keyli` : admin uniquement ; `created_by` rempli
    automatiquement (`DEFAULT auth.uid()`, ajout au schéma de référence).
  - `signup_attempts_keyli` : ajout seulement depuis le formulaire
    d'inscription (visiteurs compris), lecture admin ; `completed` côté
    serveur.
- **Registre obligatoire pour publier** (agence) : statut `registre_requis`
  dans `evaluer_publication_keyli`, refus `KY004` dans le trigger de
  publication.
Tests : `supabase/tests/admin_keyli.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-02) — messagerie, notation, signalements
Créées le 2026-10-02 (migration `20261002170000_notes_messages_signalements_keyli.sql`),
avec l'enum `report_status_keyli`. Colonnes du schéma de référence, plus :
- `messages_keyli` : CHECK corps non vide et `from_user <> to_user` ; index
  `idx_messages_destinataire_non_lus` (badge) et `idx_messages_fil`.
  Aucun paywall (PRD 11.3) : tout compte connecté écrit. Premier contact =
  au sujet d'une annonce visible, adressé à son propriétaire ; ensuite,
  réponse uniquement à quelqu'un qui nous a déjà écrit sur ce bien (fonction
  `a_recu_message_de_keyli`, qui ne regarde que la boîte de l'appelant —
  nécessaire car une policy ne peut pas interroger sa propre table). En
  pratique toute conversation est rattachée à une annonce. Lecture par les
  deux participants ; seul le destinataire modifie `read` ; un message ne se
  modifie ni ne se supprime.
- `ratings_keyli` : lecture publique ; règle de notation remplacée le
  2026-10-05 (visite effectuée ou lead conclu, voir plus haut) ; l'auteur
  peut revoir note et commentaire. `profiles_keyli.rating_avg` recalculé par le trigger
  `recalculer_note_moyenne_keyli` (décision du 2026-10-02). Index
  `idx_ratings_rated_user`.
- `reports_keyli` : CHECK motif non vide ; un seul signalement `pending`
  par personne et par annonce (index unique partiel) ; index
  `idx_reports_status_date` (file de modération). Le signaleur lit ses
  signalements, le signalé ne les voit pas ; traitement par l'admin (module
  admin).
Tests : `supabase/tests/notes_messages_signalements_keyli.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-02) — limite du forfait à la publication
Migration `20261002160000_limite_forfait_publication_keyli.sql`. Contrôle par
**trigger en base** `controler_publication_keyli` (BEFORE INSERT/UPDATE sur
`properties_keyli`) — remplace la détection prévue dans l'Edge Function
`check-subscription-overage`.
- **Comptage** (PRD §11.2) : chaque mise en ligne active à un moment du cycle
  de l'abonnement actif compte ; archivée puis republiée = nouvelle mise en
  ligne. Journal : nouvelle table `property_publications_keyli` (id,
  property_id, owner_id, subscription_id, published_at, unpublished_at,
  hors_forfait, prix_depassement figé, created_at), écrite par trigger
  uniquement, lisible par son propriétaire.
- **Sans abonnement actif** (statut `active` ET dans ses dates) : publication
  refusée — code `KY001`.
- **Au-delà du seuil, forfait avec prix de dépassement** (Propriétaire
  1 500 XOF, Grande Agence 1 000 XOF ou `prix_depassement_negocie`) : refus
  `KY003` tant que l'utilisateur n'a pas mis `accepte_depassement = true`
  sur CETTE publication ; le prix est alors figé dans le journal pour la
  facturation au cycle.
- **Agence Moyenne au-delà de 10** : refus `KY002` (montée de gamme vers
  Grande Agence), même avec accord.
- **Grande Agence avec `montant_depassement_negocie`** : couverte, marquée
  hors forfait sans prix unitaire, sans accord à l'unité.
- Nouvelle colonne `properties_keyli.accepte_depassement BOOLEAN NOT NULL
  DEFAULT false` : accord ponctuel, toujours remis à `false` par le trigger.
- Fonctions : `evaluer_publication_keyli(uuid)` (interne, non exposée) et
  `etat_publication_keyli()` (RPC de l'utilisateur connecté : statut,
  forfait, seuil, mises en ligne du cycle, prix du prochain dépassement)
  — source unique pour le trigger et l'écran.
- Verrou consultatif par compte : deux publications simultanées ne
  dépassent pas le seuil ensemble.
Reste hors base : facturation effective des dépassements au cycle et
recommandation après 2 mois consécutifs (Edge Function, avec Paystack).
Tests : `supabase/tests/limite_forfait_publication_keyli.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-02) — abonnements, transactions, tentatives de paiement
Créées le 2026-10-02 (migration `20261002150000_abonnements_keyli.sql`), avec
les enums `subscription_status_keyli` et `transaction_status_keyli`. Écarts
avec le schéma de référence (décisions du porteur de projet) :
- `subscriptions_keyli` : **formule personnalisée Grande Agence** —
  `prix_depassement_negocie DECIMAL(10,2)` (prix par annonce au-delà de 30),
  `montant_depassement_negocie DECIMAL(10,2)` (forfait mensuel au-delà de 30),
  `conditions_negociees TEXT` ; tous facultatifs, réservés au forfait
  `grande_agence`, négociés avec le super_admin.
- **Un seul abonnement actif par compte** : index unique partiel
  `uq_subscriptions_keyli_un_actif`. CHECK `end_date > start_date`.
- `payment_attempts_keyli` : `plan_type TEXT` remplacé par
  `plan_id UUID → plans_keyli` ; `status` contrôlé (`initiated`, `success`,
  `failed`, `abandoned`).
- `transactions_keyli` : `paystack_ref` unique (webhook rejoué sans doublon).
Garde-fous (trigger `validate_subscription_keyli`, valables même pour les
écritures serveur) : abonnement réservé aux rôles `owner`/`agency` ; une
agence ne prend jamais le forfait Propriétaire ; souscription uniquement à un
forfait actif ; formule négociée seulement en Grande Agence.
Accès : chacun lit ses abonnements, transactions et tentatives ; **aucune
écriture côté client** (Edge Functions Paystack et admin uniquement). Un
abonné lit son forfait même désactivé depuis (policy ajoutée sur
`plans_keyli`).
Tests : `supabase/tests/abonnements_keyli_rls.test.sql`.

## ⚠️ DÉCISIONS ACTÉES (2026-10-23) — paiement Paystack (mode test d'abord)
Migration `20261023120000_paiements_paystack_keyli.sql` ; compte Paystack
Côte d'Ivoire en **XOF** (montant envoyé ×100, comme toute devise Paystack).
- Index unique `uq_payment_attempts_keyli_reference` sur
  `payment_attempts_keyli(paystack_reference)`.
- `initier_paiement_keyli(p_plan)` (RPC, utilisateur connecté) : rôle
  owner/agency, compte actif, forfait actif, agence ≠ Propriétaire ; génère
  la référence `KEYLI-<uuid>` et crée la tentative `initiated` au prix de
  `plans_keyli` — **le montant ne vient jamais du client**.
- `confirmer_paiement_keyli(ref, montant_subunit, devise, paystack_id)`
  (serveur uniquement, `service_role`) : idempotent (webhook rejoué = sans
  effet), refuse un montant ou une devise inattendus (23514).
  - **Renouvellement** (même forfait, abonnement en cours) : `end_date + 1 mois`
    — les jours restants sont conservés.
  - **Changement de forfait** : immédiat, l'ancien passe `canceled`, nouveau
    cycle d'un mois à partir du paiement, **sans prorata**.
  - Crée la transaction `completed` (`paystack_ref` unique).
- `echec_paiement_keyli(ref, message)` (serveur) : tentative `failed`.
- Edge Functions : `handle-paystack-payment` (démarre le paiement),
  `verify-paystack-payment` (retour du navigateur, interroge Paystack),
  `paystack-webhook` (`verify_jwt = false`, signature HMAC SHA512
  `x-paystack-signature` vérifiée). Secrets : `PAYSTACK_SECRET_KEY`,
  `KEYLI_APP_URL` (Dashboard → Edge Functions → Secrets, jamais dans `.env`).
Tests : `supabase/tests/paiements_paystack_keyli.test.sql` (20 tests).

## ⚠️ DÉCISIONS ACTÉES (2026-10-25) — expiration des abonnements
Migration `20261025120000_expiration_abonnements_keyli.sql`. Décisions du
porteur : annonces **masquées** (pas archivées) à l'échéance, **aucun délai
de grâce**, rappels **J-7 et J-1**, tâche **SQL pg_cron** (pas d'Edge
Function ; l'email viendra avec le fournisseur).
- `abonnement_en_cours_keyli(user)` : abonnement `active` et
  `start_date <= now() < end_date`. Ajoutée à la policy « Lecture publique
  des annonces publiées » de `properties_keyli` (avec `compte_actif_keyli`) :
  masquage exact à l'échéance, réapparition au renouvellement, médias
  masqués avec. Le propriétaire voit toujours ses annonces.
- `subscriptions_keyli.rappel_j7_pour` / `rappel_j1_pour` : échéance déjà
  rappelée ; un renouvellement (nouvel `end_date`) réarme les rappels.
- `traiter_echeances_abonnements_keyli()` (serveur seul) : expire les
  abonnements échus (`expired` + notification `abonnement_expire`), puis
  rappels J-1 et J-7 (notification `abonnement_rappel`). Rejouable sans
  doublon. pg_cron `keyli-echeances-abonnements`, `5 * * * *`.
- Index `idx_subscriptions_keyli_actifs_echeance (end_date) WHERE active`.
- `validate_subscription_keyli` : contrôles de rôle et de forfait actif
  limités à la souscription (création, changement de compte ou de forfait),
  pour qu'une expiration n'échoue pas si le rôle du compte a changé depuis.
Tests : `supabase/tests/expiration_abonnements_keyli.test.sql` (18 tests).

## ⚠️ DÉCISIONS ACTÉES (2026-10-02) — documents_keyli + bucket documents_keyli
Créés le 2026-10-02 (migration `20261002140000_documents_keyli.sql`), avec les
enums `document_type_keyli` et `document_status_keyli`. Colonnes identiques
au schéma de référence ; `file_url` contient le **chemin** de l'objet dans le
bucket privé (`<user_id>/<fichier>`), pas une URL publique. Ajouts :
- Contrainte `documents_keyli_rejet_commente` : un rejet exige un
  `review_notes` non vide (jamais de rejet silencieux).
- Index unique partiel `uq_documents_keyli_en_cours (user_id, doc_type,
  property_id) NULLS NOT DISTINCT WHERE status IN ('pending','approved')` :
  pas de doublon en attente/approuvé (un ACD par bien) ; un rejeté se redépose.
- Index `idx_documents_status_date (status, created_at)` (file admin).
- **Bucket Storage `documents_keyli`** : privé, 5 Mo max, PDF / JPEG / PNG
  (décision du 2026-10-02) — limite appliquée par l'API Storage à chaque
  envoi, prouvée sur le projet distant (6 Mo → EntityTooLarge, .exe →
  InvalidMimeType).
Accès :
- Dépôt pour soi-même : `owner` → acd / extrait_naissance / cert_residence ;
  `agency` → registre ; fichier dans son propre dossier ; bien éventuel lui
  appartenant. Statut forcé à `pending`.
- Lecture de ses propres documents et fichiers uniquement. Aucune
  modification ni suppression côté client (fichier non remplaçable).
- Revue (approbation/rejet, `verified`/`is_verified`, audit) : côté serveur,
  avec le module admin — pas encore implémentée.
Tests : `supabase/tests/documents_keyli_rls.test.sql`.

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


