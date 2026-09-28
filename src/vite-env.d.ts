/// <reference types="vite/client" />

// Variables d'environnement exposées au client — publiques uniquement
// (voir docs/STACK.md). Aucune clé secrète ne doit être ajoutée ici.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
