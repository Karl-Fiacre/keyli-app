import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { Database } from '@/integrations/supabase/types'

export type Forfait = Database['public']['Tables']['plans_keyli']['Row']

// Forfaits proposés (lecture publique des forfaits actifs, docs/MODULES/pricing.md)
export function useForfaits() {
  return useQuery({
    queryKey: ['forfaits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans_keyli')
        .select('*')
        .eq('actif', true)
        .order('seuil_min')
      if (error) throw error
      return data
    },
  })
}

// Abonnement actif et non échu de l'utilisateur (sa propre ligne, RLS)
export function useAbonnementActif() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['abonnement', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions_keyli')
        .select('*, plans_keyli(code, nom)')
        .eq('status', 'active')
        .gt('end_date', new Date().toISOString())
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// Démarre le paiement côté serveur (Edge Function handle-paystack-payment)
// et renvoie l'URL de la page de paiement Paystack. Le montant n'est jamais
// envoyé par le client : la base le fixe depuis plans_keyli.
export function usePaiementForfait() {
  return useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase.functions.invoke<{ authorization_url: string; reference: string }>(
        'handle-paystack-payment',
        { body: { plan_id: planId } },
      )
      if (error) throw await detailErreurFonction(error)
      if (!data?.authorization_url) throw new Error('Réponse de paiement invalide')
      return data
    },
  })
}

export type StatutPaiement = 'success' | 'failed' | 'pending'

// Vérifie un paiement au retour de Paystack (Edge Function verify-paystack-payment)
export function useVerificationPaiement() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (reference: string) => {
      const { data, error } = await supabase.functions.invoke<{ statut: StatutPaiement }>('verify-paystack-payment', {
        body: { reference },
      })
      if (error) throw await detailErreurFonction(error)
      return data?.statut ?? 'pending'
    },
    onSuccess: (statut) => {
      if (statut === 'success') client.invalidateQueries({ queryKey: ['abonnement'] })
    },
  })
}

// Les Edge Functions renvoient { erreur } avec un code HTTP (CONVENTIONS.md) :
// on remonte ce message plutôt que l'erreur générique du client.
async function detailErreurFonction(erreur: unknown): Promise<Error> {
  const contexte = (erreur as { context?: Response }).context
  if (contexte && typeof contexte.json === 'function') {
    const corps = await contexte.json().catch(() => null)
    if (corps?.erreur) return new Error(corps.erreur)
  }
  return erreur instanceof Error ? erreur : new Error('Paiement impossible')
}
