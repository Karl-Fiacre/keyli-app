-- Keyli — Référentiel géographique fermé : communes et quartiers
-- (décision actée « Option A », remplace le champ libre neighborhood)
--
-- Sources : docs/reference/schema_cible_reference.sql (section COMMUNES &
-- QUARTIERS), docs/DATABASE.md, docs/MODULES/quartiers-tendance.md.
--
-- Hiérarchie à deux niveaux : Cocody est une commune, Riviera ou Angré sont
-- des quartiers de Cocody. Les listes sont FERMÉES : un formulaire de
-- publication d'annonce ne crée jamais de quartier à la volée, seul un
-- admin en ajoute (côté serveur).

-- ------------------------------------------------------------
-- Tables (colonnes identiques au schéma de référence)
-- ------------------------------------------------------------
create table public.communes_keyli (
  id          uuid primary key default gen_random_uuid(),
  nom         text unique not null,
  created_at  timestamptz default now()
);

create table public.quartiers_keyli (
  id           uuid primary key default gen_random_uuid(),
  commune_id   uuid references public.communes_keyli(id) not null,
  nom          text not null,
  created_at   timestamptz default now(),
  unique (commune_id, nom)
);

-- Sélecteur de quartier du formulaire de publication (docs/DATABASE_LOGIC.md)
create index idx_quartiers_commune on public.quartiers_keyli(commune_id);

-- ------------------------------------------------------------
-- Données de départ
-- Communes : liste fermée et complète dès le départ — les 10 communes
-- d'Abidjan + Bingerville, Songon, Anyama (Grand Abidjan).
-- Quartiers : volontairement incomplets — détaillés pour Cocody seulement,
-- un « <Commune> Centre » provisoire ailleurs, enrichis par un admin.
-- ------------------------------------------------------------
insert into public.communes_keyli (nom) values
  ('Abobo'), ('Adjamé'), ('Attécoubé'), ('Cocody'), ('Koumassi'),
  ('Marcory'), ('Plateau'), ('Port-Bouët'), ('Treichville'), ('Yopougon'),
  ('Bingerville'), ('Songon'), ('Anyama');

insert into public.quartiers_keyli (commune_id, nom)
  select c.id, q.quartier
    from public.communes_keyli c,
         unnest(
           case c.nom
             when 'Cocody' then array['Riviera', 'Angré', 'II Plateaux', 'Danga', 'Cocody Centre']
             else array[c.nom || ' Centre']
           end
         ) as q(quartier);

-- ------------------------------------------------------------
-- Row-Level Security + policies (même migration, docs/SETUP.md)
-- ------------------------------------------------------------
alter table public.communes_keyli enable row level security;
alter table public.quartiers_keyli enable row level security;

-- Lecture publique : recherche par quartier, chips de l'Accueil, sélecteur
-- du formulaire de publication — visiteurs compris.
create policy "Lecture publique des communes"
  on public.communes_keyli for select
  to anon, authenticated
  using (true);

create policy "Lecture publique des quartiers"
  on public.quartiers_keyli for select
  to anon, authenticated
  using (true);

-- Aucune policy d'écriture : la liste reste fermée par design. L'ajout de
-- quartiers par un admin passera par SQL direct ou par une future Edge
-- Function admin (module admin) avec entrée audit_logs_keyli.
revoke all on public.communes_keyli from anon, authenticated;
revoke all on public.quartiers_keyli from anon, authenticated;
grant select on public.communes_keyli to anon, authenticated;
grant select on public.quartiers_keyli to anon, authenticated;
