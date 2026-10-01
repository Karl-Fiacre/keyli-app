// Client Supabase unique de l'application web — pointe vers le projet dédié
// Keyli. Seules l'URL et la clé anon (publiques) sont utilisées ici : aucune
// clé secrète (service_role, Paystack, Cloudinary) ne doit jamais apparaître
// côté client (docs/STACK.md).
//
// Les pages n'importent jamais ce client directement : elles passent par un
// hook métier de src/hooks/ (docs/CONVENTIONS.md).
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Échec explicite au démarrage plutôt qu'une erreur réseau obscure plus tard
  throw new Error(
    'VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies dans .env (voir docs/SETUP.md, étape 4)',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
