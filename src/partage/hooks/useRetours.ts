import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/partage/hooks/useSession'
import type { Database } from '@/integrations/supabase/types'

export type Retour = Database['public']['Tables']['feedback_keyli']['Row']
export type TypeRetour = 'suggestion' | 'bug' | 'complaint' | 'recommendation'
export type StatutRetour = 'pending' | 'reviewed' | 'resolved' | 'dismissed'

export const LIBELLES_TYPE_RETOUR: Record<TypeRetour, string> = {
  suggestion: 'Suggestion',
  bug: 'Problème technique',
  complaint: 'Réclamation',
  recommendation: 'Ce que j’apprécie',
}

export const LIBELLES_STATUT_RETOUR: Record<StatutRetour, string> = {
  pending: 'En attente',
  reviewed: 'Lu par l’équipe',
  resolved: 'Traité',
  dismissed: 'Classé',
}

// Retours des utilisateurs (feedback_keyli) : chacun envoie et lit les
// siens ; la base borne les longueurs et limite à 5 retours par jour.
export function useMesRetours() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['mes-retours', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_keyli')
        .select('*')
        .eq('user_id', userId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useEnvoiRetour() {
  const { session } = useSession()
  const client = useQueryClient()
  const userId = session?.user.id
  return useMutation({
    mutationFn: async (r: { type: TypeRetour; sujet: string; message: string }) => {
      const { error } = await supabase
        .from('feedback_keyli')
        .insert({ user_id: userId as string, type: r.type, subject: r.sujet.trim(), message: r.message.trim() })
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['mes-retours', userId] }),
  })
}

// ---------- Back-office ----------
export function useFileRetours(statut: StatutRetour) {
  return useQuery({
    queryKey: ['admin-retours', statut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_keyli')
        .select('*')
        .eq('status', statut)
        .order('created_at', { ascending: statut === 'pending' })
        .limit(100)
      if (error) throw error
      // Auteurs (l'admin lit tous les profils)
      const ids = [...new Set(data.map((r) => r.user_id))]
      const auteurs = new Map<string, { nom: string; email: string; role: string }>()
      if (ids.length > 0) {
        const { data: profils, error: e2 } = await supabase
          .from('profiles_keyli')
          .select('user_id, first_name, last_name, nom_agence, email, role_keyli')
          .in('user_id', ids)
        if (e2) throw e2
        for (const p of profils) {
          const nom =
            p.role_keyli === 'agency' && p.nom_agence
              ? p.nom_agence
              : [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email
          auteurs.set(p.user_id, { nom, email: p.email, role: p.role_keyli })
        }
      }
      return data.map((r) => ({ ...r, auteur: auteurs.get(r.user_id) ?? null }))
    },
  })
}

export function useReponseRetour() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (r: { id: string; statut: StatutRetour; reponse: string }) => {
      const { error } = await supabase
        .from('feedback_keyli')
        .update({ status: r.statut, admin_response: r.reponse.trim() || null })
        .eq('id', r.id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-retours'] }),
  })
}
