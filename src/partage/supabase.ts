// Création du client Supabase Keyli, commune au web et au mobile. Chaque
// application lit l'adresse et la clé publique (anon) dans sa propre
// configuration, puis expose le client dans `@/integrations/supabase/client`
// (web : variables VITE_… ; mobile : variables EXPO_PUBLIC_…). Aucune clé
// secrète (service_role, Paystack, Cloudinary) n'est jamais fournie ici
// (docs/STACK.md).
import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

export function creerClientKeyli(
  url: string | undefined,
  cleAnon: string | undefined,
  options?: SupabaseClientOptions<'public'>,
) {
  if (!url || !cleAnon) {
    // Échec explicite au démarrage plutôt qu'une erreur réseau obscure plus tard
    throw new Error(
      "L'adresse du projet Supabase et la clé publique (anon) doivent être configurées (voir docs/SETUP.md, étape 4)",
    )
  }
  return createClient<Database>(url, cleAnon, options)
}

export type ClientKeyli = ReturnType<typeof creerClientKeyli>
