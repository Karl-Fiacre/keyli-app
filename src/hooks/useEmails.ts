import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'

// Préférence « recevoir les notifications par email » (colonne
// emails_notifications, seule modifiable par l'utilisateur ; les emails de
// service — suspension, badge retiré — partent toujours). docs/MODULES/emails.md
export function usePreferenceEmails() {
  const { session } = useSession()
  const client = useQueryClient()
  const userId = session?.user.id
  return useMutation({
    mutationFn: async (actif: boolean) => {
      const { error } = await supabase
        .from('profiles_keyli')
        .update({ emails_notifications: actif })
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['profil', userId] }),
  })
}

// Désinscription depuis le lien d'un email, sans connexion (jeton personnel)
export function useDesinscription() {
  return useMutation({
    mutationFn: async (jeton: string) => {
      const { data, error } = await supabase.rpc('desinscrire_emails_keyli', { p_jeton: jeton })
      if (error) throw error
      return data
    },
  })
}
