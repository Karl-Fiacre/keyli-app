import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/partage/hooks/useSession'
import type { Database } from '@/integrations/supabase/types'
import { erreurKeyli } from '@/partage/lib/erreurs'

export type Profil = Database['public']['Tables']['profiles_keyli']['Row']

// Profil complet de l'utilisateur connecté (la RLS ne lui laisse lire que
// le sien). Seules les colonnes autorisées par la base sont modifiables :
// prénom, nom, téléphone, photo, et nom d'agence tant que l'agence n'est pas
// vérifiée (docs/DATABASE.md).
export function useProfil() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['profil', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles_keyli')
        .select('*')
        .eq('user_id', userId!)
        .single()
      if (error) throw error
      // Compte supprimé mais session encore présente sur l'appareil (fermeture
      // interrompue, autre appareil) : la session est fermée ici, sinon la
      // personne resterait dans un compte vide dont elle ne peut pas sortir.
      if (data.compte_supprime_le) {
        await supabase.auth.signOut({ scope: 'local' })
        throw erreurKeyli('Ce compte a été supprimé.')
      }
      return data
    },
  })
}

export interface ModificationProfil {
  first_name: string
  last_name: string
  phone: string | null
  nom_agence?: string
}

export function useModificationProfil() {
  const { session } = useSession()
  const client = useQueryClient()
  const userId = session?.user.id
  return useMutation({
    mutationFn: async (modif: ModificationProfil) => {
      const { error } = await supabase.from('profiles_keyli').update(modif).eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['profil', userId] }),
  })
}
