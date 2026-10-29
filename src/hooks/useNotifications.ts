import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'

// Filet de sécurité si la connexion temps réel tombe
const ACTUALISATION = 60_000
const NOMBRE_AFFICHE = 20

// Dernières notifications du compte (RLS : les siennes uniquement)
export function useNotifications() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['notifications', 'liste', userId],
    enabled: !!userId,
    refetchInterval: ACTUALISATION,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications_keyli')
        .select('id, type, titre, contenu, property_id, lue, created_at')
        .order('created_at', { ascending: false })
        .limit(NOMBRE_AFFICHE)
      if (error) throw error
      return data
    },
  })
}

// Nombre de non lues (pastille de la cloche)
export function useNotificationsNonLues() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['notifications', 'non-lues', userId],
    enabled: !!userId,
    refetchInterval: ACTUALISATION,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications_keyli')
        .select('id', { count: 'exact', head: true })
        .eq('lue', false)
      if (error) throw error
      return count ?? 0
    },
  })
}

// Marquer lue (une notification, ou toutes) — seule la colonne « lue » est
// modifiable, règle en base
export function useMarquerNotifications() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id?: string) => {
      let requete = supabase.from('notifications_keyli').update({ lue: true }).eq('lue', false)
      if (id) requete = requete.eq('id', id)
      const { error } = await requete
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

// Temps réel : une nouvelle notification rafraîchit la cloche et déclenche
// l'oscillation (callback). À monter une seule fois (mise en page).
export function useNotificationsTempsReel(surReception: () => void) {
  const { session } = useSession()
  const client = useQueryClient()
  const userId = session?.user.id
  const rappel = useRef(surReception)
  rappel.current = surReception
  useEffect(() => {
    if (!userId) return
    const canal = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications_keyli' }, () => {
        client.invalidateQueries({ queryKey: ['notifications'] })
        rappel.current()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [userId, client])
}
