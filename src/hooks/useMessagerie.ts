import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'

// Filet de sécurité si la connexion temps réel tombe (réseau mobile instable)
const ACTUALISATION = 60_000

// Identifiants venus de l'URL : validés avant d'entrer dans un filtre
export const estUuid = (v: string | null | undefined): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v)

// Conversations du compte (une par bien et interlocuteur), calculées en base
export function useConversations() {
  const { session } = useSession()
  return useQuery({
    queryKey: ['messagerie', 'conversations', session?.user.id],
    enabled: !!session,
    refetchInterval: ACTUALISATION,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mes_conversations_keyli')
      if (error) throw error
      return data
    },
  })
}

// Nombre de messages reçus non lus (pastille de l'en-tête)
export function useMessagesNonLus() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['messagerie', 'non-lus', userId],
    enabled: !!userId,
    refetchInterval: ACTUALISATION,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('messages_keyli')
        .select('id', { count: 'exact', head: true })
        .eq('to_user', userId as string)
        .eq('read', false)
      if (error) throw error
      return count ?? 0
    },
  })
}

// Messages d'une conversation, du plus ancien au plus récent (RLS : ses
// propres messages uniquement)
export function useFil(propertyId: string | null, interlocuteur: string | undefined) {
  const { session } = useSession()
  const moi = session?.user.id
  return useQuery({
    queryKey: ['messagerie', 'fil', propertyId, interlocuteur],
    enabled: !!moi && estUuid(interlocuteur) && (propertyId === null || estUuid(propertyId)),
    refetchInterval: ACTUALISATION,
    queryFn: async () => {
      let requete = supabase
        .from('messages_keyli')
        .select('id, from_user, to_user, body, read, created_at')
        .or(`and(from_user.eq.${moi},to_user.eq.${interlocuteur}),and(from_user.eq.${interlocuteur},to_user.eq.${moi})`)
        .order('created_at')
      requete = propertyId ? requete.eq('property_id', propertyId) : requete.is('property_id', null)
      const { data, error } = await requete
      if (error) throw error
      return data
    },
  })
}

// Ouverture réelle du fil : les messages reçus passent « lus » (seul le
// destinataire le peut, règle en base)
export function useMarquerLu() {
  const { session } = useSession()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ propertyId, interlocuteur }: { propertyId: string | null; interlocuteur: string }) => {
      let requete = supabase
        .from('messages_keyli')
        .update({ read: true })
        .eq('to_user', session?.user.id as string)
        .eq('from_user', interlocuteur)
        .eq('read', false)
      requete = propertyId ? requete.eq('property_id', propertyId) : requete.is('property_id', null)
      const { error } = await requete
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['messagerie'] }),
  })
}

// Réponse dans une conversation (la base refuse tout démarchage à froid)
export function useRepondre() {
  const { session } = useSession()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ propertyId, interlocuteur, message }: { propertyId: string | null; interlocuteur: string; message: string }) => {
      const { error } = await supabase.from('messages_keyli').insert({
        from_user: session?.user.id as string,
        to_user: interlocuteur,
        property_id: propertyId,
        body: message,
      })
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['messagerie'] }),
  })
}

// Temps réel (Supabase Realtime) : tout nouveau message visible par le
// compte rafraîchit la messagerie. À monter une seule fois (mise en page).
export function useMessagesTempsReel() {
  const { session } = useSession()
  const client = useQueryClient()
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    const canal = supabase
      .channel(`messages-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_keyli' }, () =>
        client.invalidateQueries({ queryKey: ['messagerie'] }),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [userId, client])
}
