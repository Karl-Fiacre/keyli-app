import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { ConfigCarte } from '@/lib/googleMaps'

// Configuration publique de Google Maps (clé de navigateur restreinte + Map
// ID) servie par l'Edge Function get-maps-config, jamais en dur dans le code.
// En développement local (Edge Functions non lancées), repli facultatif sur
// VITE_GOOGLE_MAPS_API_KEY / VITE_GOOGLE_MAPS_MAP_ID du .env local.
// null si la carte n'est pas encore configurée.
export function useConfigCarte() {
  return useQuery({
    queryKey: ['config-carte'],
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<ConfigCarte | null> => {
      const { data, error } = await supabase.functions.invoke<ConfigCarte>('get-maps-config')
      if (!error && data?.cle && data.mapId) return data
      const cle = import.meta.env.DEV ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY : undefined
      const mapId = import.meta.env.DEV ? import.meta.env.VITE_GOOGLE_MAPS_MAP_ID : undefined
      return cle && mapId ? { cle, mapId } : null
    },
  })
}
