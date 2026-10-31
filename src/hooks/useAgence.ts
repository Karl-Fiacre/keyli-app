import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { IndicateursProprietaire } from '@/hooks/useTableauDeBord'
import type { EtapeLead } from '@/lib/dashboard'

// Données et actions du dashboard Agence. Calculs en base (migration
// 20261104120000_dashboard_agence_keyli.sql) ; la RLS limite chaque compte
// à ses leads et à ses agents.

export interface IndicateursAgence extends IndicateursProprietaire {
  leads_actifs: number
  leads_nouveaux: number
  leads_nouveaux_prec: number
  leads_conclus: number
  note_moyenne: number | null
  nb_avis: number
  annonces_en_attente: number
  annonces_archivees: number
}

export function useIndicateursAgence(jours: number) {
  const { session } = useSession()
  return useQuery({
    queryKey: ['agence', 'indicateurs', session?.user.id, jours],
    enabled: !!session,
    placeholderData: (precedent) => precedent, // pas de saut visuel au changement de période
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tableau_bord_agence_keyli', { p_jours: jours })
      if (error) throw error
      return data as unknown as IndicateursAgence // jsonb construit par la fonction
    },
  })
}

export function usePipelineLeads() {
  const { session } = useSession()
  return useQuery({
    queryKey: ['agence', 'pipeline', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pipeline_leads_keyli')
      if (error) throw error
      return data
    },
  })
}

export function usePerformanceEquipe(jours: number) {
  const { session } = useSession()
  return useQuery({
    queryKey: ['agence', 'equipe', session?.user.id, jours],
    enabled: !!session,
    placeholderData: (precedent) => precedent,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('performance_equipe_keyli', { p_jours: jours })
      if (error) throw error
      return data
    },
  })
}

// Trois conseils à règles fixes (prix, opportunité, réactivité)
export function useConseilsAgence() {
  const { session } = useSession()
  return useQuery({
    queryKey: ['agence', 'conseils', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('conseils_agence_keyli')
      if (error) throw error
      return data
    },
  })
}

// Les données de l'agence dépendent toutes des leads et des agents
function useRafraichirAgence() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['agence'] })
}

// Changer l'étape d'un lead (menu de la carte) ; RLS : ses leads seulement
export function useChangerEtapeLead() {
  const rafraichir = useRafraichirAgence()
  return useMutation({
    mutationFn: async ({ id, etape }: { id: string; etape: EtapeLead }) => {
      const { error } = await supabase.from('leads_keyli').update({ stage: etape }).eq('id', id)
      if (error) throw error
    },
    onSettled: rafraichir,
  })
}

// Attribuer un lead à un agent (la base vérifie que l'agent est à l'agence)
export function useAssignerAgentLead() {
  const rafraichir = useRafraichirAgence()
  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string | null }) => {
      const { error } = await supabase.from('leads_keyli').update({ agent_id: agentId }).eq('id', id)
      if (error) throw error
    },
    onSettled: rafraichir,
  })
}

// Ajouter un agent interne (sans compte de connexion)
export function useAjouterAgent() {
  const { session } = useSession()
  const rafraichir = useRafraichirAgence()
  return useMutation({
    mutationFn: async (nom: string) => {
      const { error } = await supabase
        .from('agency_agents_keyli')
        .insert({ agency_user_id: session!.user.id, nom: nom.trim() })
      if (error) throw error
    },
    onSuccess: rafraichir,
  })
}

// Désactiver / réactiver un agent (jamais de suppression : historique conservé)
export function useActiverAgent() {
  const rafraichir = useRafraichirAgence()
  return useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase.from('agency_agents_keyli').update({ actif }).eq('id', id)
      if (error) throw error
    },
    onSuccess: rafraichir,
  })
}
