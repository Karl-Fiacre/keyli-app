# Keyli

Plateforme immobilière de confiance pour la Côte d'Ivoire (pilote Abidjan).
Web/PWA React + Supabase. Éditeur : Nguessan-IT.

Toute la documentation du projet est dans [`docs/`](docs/INDEX.md) — commencer
par `docs/INDEX.md` puis `docs/etat_avancement.md`. Règles pour Claude Code :
[`CLAUDE.md`](CLAUDE.md).

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseigner l'URL et la clé anon du projet Supabase
npm run dev
```

## Base de données

Migrations dans `supabase/migrations/`, tests RLS dans `supabase/tests/`
(voir `docs/SETUP.md`).

```bash
npm run db:start    # Postgres Supabase local (Docker) + migrations
npm run db:test     # tests RLS (pgTAP)
npm run gen:types   # régénère src/integrations/supabase/types.ts
```
