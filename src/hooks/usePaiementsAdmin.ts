import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { StatutTentative } from '@/lib/paiements'

// Back-office des paiements (Sprint 9, docs/MODULES/paiements.md). Toutes les
// lectures sont réservées aux admins par la base (est_admin_keyli).

export function useSynthesePaiements(debut: string, fin: string) {
  return useQuery({
    queryKey: ['admin', 'paiements', 'synthese', debut, fin],
    enabled: !!debut && !!fin && debut <= fin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('synthese_paiements_keyli', { p_debut: debut, p_fin: fin }).single()
      if (error) throw error
      return data
    },
  })
}

export function useControlesPaiements() {
  return useQuery({
    queryKey: ['admin', 'paiements', 'controles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('controles_paiements_keyli')
      if (error) throw error
      return data
    },
  })
}

export function usePaiementsAdmin(statut: StatutTentative | null) {
  return useQuery({
    queryKey: ['admin', 'paiements', 'liste', statut],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('paiements_admin_keyli', {
        ...(statut ? { p_statut: statut } : {}),
        p_limite: 100,
      })
      if (error) throw error
      return data
    },
  })
}

// Vérification immédiate d'un paiement auprès de Paystack (Edge Function
// rapprocher-paiements, contrôle admin fait côté serveur)
export function useVerifierPaiement() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (reference: string) => {
      const { data, error } = await supabase.functions.invoke<{
        confirme: number
        refuse: number
        abandonne: number
        en_attente: number
        erreur: number
      }>('rapprocher-paiements', { body: { reference } })
      if (error) {
        const corps = await (error as { context?: Response }).context?.json?.().catch(() => null)
        throw new Error(corps?.erreur ?? 'Vérification impossible')
      }
      if (!data) throw new Error('Réponse de vérification invalide')
      if (data.confirme) return 'Paiement réussi : le forfait est activé.'
      if (data.refuse) return 'Paiement refusé : l’annonceur est prévenu.'
      if (data.abandonne) return 'Paiement sans issue depuis plus de 24 h : marqué abandonné.'
      if (data.erreur) return 'Paystack n’a pas répondu : nouvel essai au prochain passage.'
      return 'Toujours en attente chez Paystack.'
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['admin', 'paiements'] }),
  })
}
