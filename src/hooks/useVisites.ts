import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { estUuid } from '@/hooks/useMessagerie'
import type { Database } from '@/integrations/supabase/types'

export type StatutVisite = Database['public']['Enums']['visit_status_keyli']

// Propriétaire de l'annonce d'une conversation (null si elle n'est plus
// visible) : seul lui planifie et met à jour les visites
export function useProprietaireAnnonce(propertyId: string | null) {
  return useQuery({
    queryKey: ['annonce-proprietaire', propertyId],
    enabled: estUuid(propertyId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties_keyli')
        .select('owner_id')
        .eq('id', propertyId as string)
        .maybeSingle()
      if (error) throw error
      return data?.owner_id ?? null
    },
  })
}

// Visites entre moi et l'interlocuteur pour ce bien (RLS : le propriétaire
// voit celles qu'il planifie, le visiteur les siennes)
export function useVisitesConversation(propertyId: string | null, interlocuteur: string) {
  const { session } = useSession()
  const moi = session?.user.id
  return useQuery({
    queryKey: ['visites', propertyId, interlocuteur],
    enabled: !!moi && estUuid(propertyId) && estUuid(interlocuteur),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits_keyli')
        .select('id, scheduled_at, status, scheduled_by, visitor_user_id')
        .eq('property_id', propertyId as string)
        .or(
          `and(scheduled_by.eq.${moi},visitor_user_id.eq.${interlocuteur}),and(scheduled_by.eq.${interlocuteur},visitor_user_id.eq.${moi})`,
        )
        .order('scheduled_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

function useInvaliderVisites() {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries({ queryKey: ['visites'] })
    client.invalidateQueries({ queryKey: ['peut-noter'] })
  }
}

// Planifier (propriétaire) : la base rattache le lead, le fait avancer et
// notifie le visiteur
export function usePlanifierVisite() {
  const { session } = useSession()
  const invalider = useInvaliderVisites()
  return useMutation({
    mutationFn: async ({ propertyId, visiteur, quand }: { propertyId: string; visiteur: string; quand: Date }) => {
      const { error } = await supabase.from('visits_keyli').insert({
        property_id: propertyId,
        scheduled_by: session?.user.id as string,
        visitor_user_id: visiteur,
        scheduled_at: quand.toISOString(),
      })
      if (error) throw error
    },
    onSuccess: invalider,
  })
}

// Déplacer, marquer effectuée ou annuler (propriétaire ; règles en base)
export function useMettreAJourVisite() {
  const invalider = useInvaliderVisites()
  return useMutation({
    mutationFn: async ({ id, statut, quand }: { id: string; statut?: StatutVisite; quand?: Date }) => {
      const { error } = await supabase
        .from('visits_keyli')
        .update({ ...(statut ? { status: statut } : {}), ...(quand ? { scheduled_at: quand.toISOString() } : {}) })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalider,
  })
}

// Puis-je noter cette personne pour ce bien ? (visite effectuée ou lead
// conclu entre nous — calculé en base)
export function usePeutNoter(propertyId: string | null, autre: string) {
  const { session } = useSession()
  return useQuery({
    queryKey: ['peut-noter', propertyId, autre],
    enabled: !!session && estUuid(propertyId) && estUuid(autre),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('relation_notable_keyli', {
        p_property: propertyId as string,
        p_autre: autre,
      })
      if (error) throw error
      return !!data
    },
  })
}

// Mon avis déjà donné sur cette personne pour ce bien (pour le modifier)
export function useMonAvis(propertyId: string | null, note: string) {
  const { session } = useSession()
  const moi = session?.user.id
  return useQuery({
    queryKey: ['avis', 'mien', propertyId, note],
    enabled: !!moi && estUuid(propertyId) && estUuid(note),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ratings_keyli')
        .select('id, rating, comment')
        .eq('property_id', propertyId as string)
        .eq('rater_id', moi as string)
        .eq('rated_user_id', note)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// Donner ou modifier son avis (la base vérifie qu'on a le droit de noter
// et recalcule la moyenne publique)
export function useEnregistrerAvis() {
  const { session } = useSession()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (a: { id?: string; propertyId: string; note: string; etoiles: number; commentaire: string }) => {
      const commentaire = a.commentaire.trim() || null
      const { error } = a.id
        ? await supabase.from('ratings_keyli').update({ rating: a.etoiles, comment: commentaire }).eq('id', a.id)
        : await supabase.from('ratings_keyli').insert({
            property_id: a.propertyId,
            rater_id: session?.user.id as string,
            rated_user_id: a.note,
            rating: a.etoiles,
            comment: commentaire,
          })
      if (error) throw error
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['avis'] })
      client.invalidateQueries({ queryKey: ['fiche-annonce'] })
    },
  })
}

// Avis publics reçus par une personne (fiche d'annonce)
export function useAvisRecus(userId: string | undefined) {
  return useQuery({
    queryKey: ['avis', 'recus', userId],
    enabled: estUuid(userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('avis_recus_keyli', { p_user: userId as string })
      if (error) throw error
      return data
    },
  })
}
