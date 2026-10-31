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
      const { data, error } = await supabase.from('plans_keyli').select('*').eq('actif', true).order('seuil_min')
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

// Dernier abonnement expiré (affiché quand aucun abonnement n'est en cours :
// les annonces sont alors masquées au public jusqu'au renouvellement)
export function useDernierAbonnementExpire(actif: boolean) {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['abonnement', userId, 'expire'],
    enabled: !!userId && !actif,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions_keyli')
        .select('end_date, plans_keyli(nom)')
        .eq('status', 'expired')
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// Dépassements de forfait des cycles clôturés, pas encore payés : ils sont
// ajoutés par le serveur au prochain paiement (le client ne fait qu'afficher)
export function useDepassementsAPayer() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['abonnement', userId, 'depassements'],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('depassements_cycle_keyli')
        .select('id, cycle_debut, cycle_fin, nb_depassement, montant')
        .eq('statut', 'a_payer')
        .order('cycle_debut')
      if (error) throw error
      return data
    },
  })
}

// Cycle mensuel en cours de l'abonnement (bornes calculées par la base :
// le seuil d'annonces est mensuel, même pour un abonnement prolongé)
export function useCycleEnCours(abonnement: { start_date: string; end_date: string } | null | undefined) {
  return useQuery({
    queryKey: ['abonnement', 'cycle', abonnement?.start_date, abonnement?.end_date],
    enabled: !!abonnement,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('cycle_abonnement_keyli', {
          p_start: abonnement!.start_date,
          p_end: abonnement!.end_date,
          p_at: new Date().toISOString(),
        })
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// Historique des paiements (ses propres transactions, RLS), le plus récent d'abord
export function useHistoriquePaiements(limite = 12) {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['abonnement', userId, 'historique', limite],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions_keyli')
        .select('id, amount, currency, status, paystack_ref, created_at, subscriptions_keyli(plans_keyli(nom))')
        .order('created_at', { ascending: false })
        .limit(limite)
      if (error) throw error
      return data
    },
  })
}

// Dernière recommandation de forfait (règle des 2 mois de dépassement,
// envoyée par la base) reçue depuis moins de 60 jours
export function useRecommandationForfait() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['abonnement', userId, 'recommandation'],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications_keyli')
        .select('id, titre, contenu, created_at')
        .eq('type', 'recommandation_forfait')
        .gt('created_at', new Date(Date.now() - 60 * 86_400_000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
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
