// Client Supabase de l'application mobile — même fabrique que le web
// (src/partage/supabase.ts), configuration propre au mobile : variables
// EXPO_PUBLIC_… (URL et clé publique anon uniquement, docs/STACK.md) et
// session gardée dans le coffre de l'appareil.
//
// La logique partagée (src/partage) importe ce module sous le chemin
// `@/integrations/supabase/client` (alias de metro.config.js).
import { AppState } from 'react-native'
import { creerClientKeyli } from '@/partage/supabase'
import { stockageSecurise } from '@mobile/services/native/stockageSecurise'

export const supabase = creerClientKeyli(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: stockageSecurise,
      persistSession: true,
      autoRefreshToken: true,
      // Pas d'adresse de page à lire sur mobile (liens des emails ouverts sur le site)
      detectSessionInUrl: false,
    },
  },
)

// Renouvellement du jeton seulement quand l'application est au premier plan
// (recommandation Supabase pour React Native)
AppState.addEventListener('change', (etat) => {
  if (etat === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
