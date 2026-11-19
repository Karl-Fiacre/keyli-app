import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/partage/hooks/useSession'
import type { MotifSignalement } from '@/partage/hooks/useVerification'

// Blocage et signalement d'un utilisateur (exigence des boutiques pour le
// contenu généré par les utilisateurs). La base refuse tout message entre
// deux comptes dont l'un a bloqué l'autre (policy restrictive de
// messages_keyli) : l'interface ne fait que refléter cette règle.

export function useMesBlocages() {
  const { session } = useSession()
  return useQuery({
    queryKey: ['blocages', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mes_blocages_keyli')
      if (error) throw error
      return data
    },
  })
}

// Ai-je bloqué cette personne ? (lecture de mes propres blocages)
export function useEstBloque(autre: string | undefined) {
  const blocages = useMesBlocages()
  return !!autre && !!blocages.data?.some((b) => b.bloque_id === autre)
}

export function useBloquer() {
  const { session } = useSession()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (bloqueId: string) => {
      const { error } = await supabase
        .from('blocages_keyli')
        .insert({ bloqueur_id: session?.user.id as string, bloque_id: bloqueId })
      // Déjà bloqué : rien à faire
      if (error && error.code !== '23505') throw error
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['blocages'] })
      client.invalidateQueries({ queryKey: ['messagerie'] })
    },
  })
}

export function useDebloquer() {
  const { session } = useSession()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (bloqueId: string) => {
      const { error } = await supabase
        .from('blocages_keyli')
        .delete()
        .eq('bloqueur_id', session?.user.id as string)
        .eq('bloque_id', bloqueId)
      if (error) throw error
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['blocages'] })
      client.invalidateQueries({ queryKey: ['messagerie'] })
    },
  })
}

// Signaler un utilisateur qui vous a écrit (la base vérifie l'échange)
export function useSignalerUtilisateur() {
  const { session } = useSession()
  return useMutation({
    mutationFn: async ({
      utilisateurId,
      motif,
      precision,
    }: {
      utilisateurId: string
      motif: MotifSignalement
      precision: string
    }) => {
      const { error } = await supabase.from('reports_keyli').insert({
        reporter_id: session?.user.id as string,
        reported_user_id: utilisateurId,
        motif,
        reason: precision.trim() || null,
      })
      if (error) {
        if (error.code === '23505') throw new Error("Vous avez déjà signalé cette personne : l'équipe Keyli l'examine.")
        throw error
      }
    },
  })
}
