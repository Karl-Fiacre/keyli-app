// Génère functions/_config.generated.ts au moment du déploiement
// (npm run deploy), à partir des mêmes variables publiques que le site
// (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, lues par Vite dans .env).
// Ces valeurs sont déjà publiques dans le site publié ; le fichier généré
// n'est jamais versionné (.gitignore). Aucune clé secrète ici.
import { writeFileSync } from 'node:fs'
import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), 'VITE_')
const url = env.VITE_SUPABASE_URL
const cle = env.VITE_SUPABASE_ANON_KEY
if (!url || !cle) {
  console.error('VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant dans .env : fonctions non configurées.')
  process.exit(1)
}
writeFileSync(
  'functions/_config.generated.ts',
  `// Fichier généré par scripts/config-fonctions.mjs — ne pas modifier, ne pas versionner\n` +
    `export const SUPABASE_URL = ${JSON.stringify(url)}\nexport const SUPABASE_CLE_PUBLIQUE = ${JSON.stringify(cle)}\n`,
)
console.log('functions/_config.generated.ts écrit')
