import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'

export type EtapeDemarrage = 'profil' | 'documents' | 'verification' | 'forfait' | 'annonce' | 'equipe'

// Parcours de démarrage d'un propriétaire ou d'une agence : étapes calculées
// par la base d'après les données réelles (etapes_demarrage_keyli), jamais
// cochées à la main. Liste vide pour les autres rôles.
export function useEtapesDemarrage() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['demarrage', userId],
    enabled: !!userId,
    // Recalculé à chaque retour sur le tableau de bord (profil, documents, annonce…)
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('etapes_demarrage_keyli')
      if (error) throw error
      return data.map((e) => ({ etape: e.etape as EtapeDemarrage, faite: e.faite }))
    },
  })
}
