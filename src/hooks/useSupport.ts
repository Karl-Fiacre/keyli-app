import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { DonneesSupport, SujetSupport } from '@/lib/validation'

// Aide et support (Sprint 7, docs/MODULES/ouverture-grand-public.md) :
// demandes envoyées depuis la page Aide, visiteurs compris. Les comptes
// connectés gardent aussi les « retours » (useRetours), avec réponse suivie.
export type StatutSupport = 'nouvelle' | 'en_cours' | 'traitee' | 'classee'

export const LIBELLES_SUJET_SUPPORT: Record<SujetSupport, string> = {
  compte: 'Mon compte, la connexion',
  annonce: 'Une annonce',
  verification: 'La vérification (badge)',
  paiement: 'Un paiement, un forfait',
  partenariat: 'Partenariat, presse',
  autre: 'Autre question',
}

export const LIBELLES_STATUT_SUPPORT: Record<StatutSupport, string> = {
  nouvelle: 'Nouvelles',
  en_cours: 'En cours',
  traitee: 'Traitées',
  classee: 'Classées',
}

// Envoi : la base valide et limite le débit (envoyer_demande_support_keyli)
export function useEnvoiSupport() {
  return useMutation({
    mutationFn: async (d: DonneesSupport) => {
      const { error } = await supabase.rpc('envoyer_demande_support_keyli', {
        p_email: d.email,
        p_nom: d.nom,
        p_sujet: d.sujet,
        p_message: d.message,
      })
      if (error) throw error
    },
  })
}

// ---------- Back-office (lecture et suivi réservés aux admins par la RLS) ----------
export function useDemandesSupport(statut: StatutSupport) {
  return useQuery({
    queryKey: ['admin-support', statut],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demandes_support_keyli')
        .select('id, email, nom, sujet, message, statut, note_admin, user_id, created_at')
        .eq('statut', statut)
        .order('created_at', { ascending: statut === 'nouvelle' || statut === 'en_cours' })
        .limit(200)
      if (error) throw error
      return data
    },
  })
}

export function useSuiviSupport() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (d: { id: string; statut: StatutSupport; note: string }) => {
      const { error } = await supabase
        .from('demandes_support_keyli')
        .update({ statut: d.statut, note_admin: d.note.trim() || null })
        .eq('id', d.id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-support'] }),
  })
}
