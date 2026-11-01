/// <reference types="vite/client" />

// Variables d'environnement exposées au client — publiques uniquement
// (voir docs/STACK.md). Aucune clé secrète ne doit être ajoutée ici.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // Développement local uniquement (repli de get-maps-config) : clé de
  // navigateur Google Maps restreinte, publique par nature
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
