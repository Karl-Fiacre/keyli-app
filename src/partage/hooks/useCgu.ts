import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/partage/hooks/useSession'
import { VERSION_CGU } from '@/partage/lib/juridique'

// Acceptation des conditions générales par un compte déjà inscrit (compte
// antérieur aux CGU, ou nouvelle version publiée). La base enregistre la
// version et la date ; elle refuse une version qui n'est plus en vigueur.
export function useAcceptationCgu() {
  const { session } = useSession()
  const client = useQueryClient()
  const userId = session?.user.id
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('accepter_cgu_keyli', { p_version: VERSION_CGU })
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['profil', userId] }),
  })
}
