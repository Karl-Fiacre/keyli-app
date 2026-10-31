import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { CriteresAlerte } from '@/lib/recherche'

// Alertes de recherche : création et pause / réactivation (jamais de
// suppression, règle en base). La lecture passe par useMesAlertes
// (useTableauDeBord.ts) ; la notification est déclenchée par la base à
// chaque publication correspondante.

function useRafraichirAlertes() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['tableau-de-bord', 'alertes'] })
}

export function useCreerAlerte() {
  const { session } = useSession()
  const rafraichir = useRafraichirAlertes()
  return useMutation({
    mutationFn: async (criteres: CriteresAlerte) => {
      const { error } = await supabase.from('search_alerts_keyli').insert({ user_id: session!.user.id, criteres })
      if (error) throw error
    },
    onSuccess: rafraichir,
  })
}

export function useBasculerAlerte() {
  const rafraichir = useRafraichirAlertes()
  return useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase.from('search_alerts_keyli').update({ actif }).eq('id', id)
      if (error) throw error
    },
    onSettled: rafraichir,
  })
}
