-- Keyli — Module pricing : table des forfaits (remplace l'enum
-- subscription_plan_keyli, décision actée « Option B »)
--
-- Sources : docs/reference/schema_cible_reference.sql (section FORFAITS),
-- docs/DATABASE.md, docs/MODULES/pricing.md, docs/PRD_REGLES.md.
--
-- Les seuils et prix vivent en données, pas en code : un changement de
-- tarif se fait par une mise à jour de ligne, sans redéploiement. Le client
-- ne fait que LIRE les forfaits — aucun calcul de prix ou de dépassement
-- côté web (règle d'or, docs/PRD_REGLES.md).

-- ------------------------------------------------------------
-- Table plans_keyli (colonnes identiques au schéma de référence)
-- ------------------------------------------------------------
create table public.plans_keyli (
  id                          uuid primary key default gen_random_uuid(),
  code                        text unique not null,   -- 'proprietaire' | 'agence_moyenne' | 'grande_agence'
  nom                         text not null,
  seuil_min                   integer not null,
  seuil_max                   integer,                -- NULL = illimité (grande agence, sur devis au-delà)
  prix_mensuel                numeric(10,2) not null,
  prix_depassement_unitaire   numeric(10,2),          -- NULL = pas de dépassement à l'unité (montée de gamme)
  actif                       boolean default true,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

create trigger trg_plans_keyli_updated_at
  before update on public.plans_keyli
  for each row execute function public.set_updated_at_keyli();

-- ------------------------------------------------------------
-- Les 3 forfaits (PRD 11.1, docs/DATABASE.md) — montants en XOF
-- ------------------------------------------------------------
insert into public.plans_keyli (code, nom, seuil_min, seuil_max, prix_mensuel, prix_depassement_unitaire) values
  ('proprietaire',   'Propriétaire',   1,  4,    5000,  1500),
  ('agence_moyenne', 'Agence Moyenne', 5,  10,   15000, null),
  ('grande_agence',  'Grande Agence',  11, null, 25000, 1000);

-- ------------------------------------------------------------
-- Row-Level Security + policies (même migration, docs/SETUP.md)
-- ------------------------------------------------------------
alter table public.plans_keyli enable row level security;

-- Lecture publique (visiteurs compris : page de tarifs) des seuls forfaits
-- actifs. L'accès d'un abonné à un forfait désactivé depuis sa souscription
-- (docs/DATABASE_LOGIC.md) sera ouvert avec subscriptions_keyli.
create policy "Lecture publique des forfaits actifs"
  on public.plans_keyli for select
  to anon, authenticated
  using (actif = true);

-- Aucune policy d'écriture : les forfaits ne se modifient que côté serveur
-- (SQL direct ou future Edge Function admin avec entrée audit_logs_keyli).
revoke all on public.plans_keyli from anon, authenticated;
grant select on public.plans_keyli to anon, authenticated;
