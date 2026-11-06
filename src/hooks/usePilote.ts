import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'
import type { DonneesCandidature, ProfilPilote } from '@/lib/validation'

export type StatutCandidature = Database['public']['Enums']['inscription_status_keyli']
export type PrioriteCandidature = Database['public']['Enums']['priority_level_keyli']

export const LIBELLES_PROFIL_PILOTE: Record<ProfilPilote, string> = {
  proprietaire: 'Propriétaire',
  agence: 'Agence immobilière',
  chercheur: 'Je cherche un logement',
}

export const LIBELLES_STATUT_CANDIDATURE: Record<StatutCandidature, string> = {
  en_attente: 'En attente',
  contacte: 'Contactée',
  converti: 'Convertie',
  rejete: 'Écartée',
}

export const LIBELLES_PRIORITE: Record<PrioriteCandidature, string> = {
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
}

// Candidature au pilote (visiteurs compris). La base valide, limite le débit
// et répond de la même façon que l'email soit nouveau ou non.
export function useCandidaturePilote() {
  return useMutation({
    mutationFn: async (d: DonneesCandidature) => {
      const { error } = await supabase.rpc('candidater_pilote_keyli', {
        p_email: d.email,
        p_prenom: d.prenom,
        p_nom: d.nom,
        p_telephone: d.telephone,
        p_profil: d.profil,
        p_commune: d.commune || undefined,
        p_nom_agence: d.profil === 'agence' ? d.nomAgence : undefined,
        p_nb_biens: d.profil !== 'chercheur' && d.nbBiens ? Number(d.nbBiens) : undefined,
        p_message: d.message || undefined,
      })
      if (error) throw error
    },
  })
}

// ---------- Back-office ----------
export function useCandidatures(statut: StatutCandidature) {
  return useQuery({
    queryKey: ['admin-candidatures', statut],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('candidatures_pilote_keyli', { p_statut: statut })
      if (error) throw error
      return data
    },
  })
}

export function useSuiviCandidature() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (c: { id: string; statut: StatutCandidature; priorite: PrioriteCandidature; note: string }) => {
      const { error } = await supabase
        .from('inscription_pilot_keyli')
        .update({ status: c.statut, priority_level: c.priorite, note_admin: c.note.trim() || null })
        .eq('id', c.id)
      if (error) throw error
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin-candidatures'] })
      client.invalidateQueries({ queryKey: ['admin', 'suivi-pilote'] })
    },
  })
}

// Entonnoir de démarrage des annonceurs, candidatures, retours, activité terrain
export function useSuiviPilote() {
  return useQuery({
    queryKey: ['admin', 'suivi-pilote'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('suivi_pilote_keyli').single()
      if (error) throw error
      return data
    },
  })
}
