import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'

// Données des tableaux de bord Propriétaire et Chercheur. Tous les calculs
// (vues, contacts, écart au prix du quartier, score de pertinence) sont faits
// en base (migration 20261103120000_tableaux_de_bord_keyli.sql) : ces hooks
// ne font que lire.

export interface IndicateursProprietaire {
  jours: number
  annonces_actives: number
  annonces_verifiees: number
  vues: number
  vues_prec: number
  contacts: number
  contacts_prec: number
  serie_vues: number[]
}

// Indicateurs sur la période (7 à 90 jours) et la période précédente
export function useIndicateursProprietaire(jours = 30) {
  const { session } = useSession()
  return useQuery({
    queryKey: ['tableau-de-bord', 'indicateurs', session?.user.id, jours],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tableau_bord_proprietaire_keyli', { p_jours: jours })
      if (error) throw error
      return data as unknown as IndicateursProprietaire // jsonb construit par la fonction
    },
  })
}

// Mes annonces en ligne face au prix moyen fiable de leur quartier
export function useMesBiensMarche() {
  const { session } = useSession()
  return useQuery({
    queryKey: ['tableau-de-bord', 'biens-marche', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mes_biens_marche_keyli')
      if (error) throw error
      return data
    },
  })
}

// Recommandations « Pour vous » (score 0-100, NULL sans historique)
export function useRecommandations(limite = 10) {
  const { session } = useSession()
  return useQuery({
    queryKey: ['tableau-de-bord', 'recommandations', session?.user.id, limite],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('recommandations_keyli', { p_limite: limite })
      if (error) throw error
      return data
    },
  })
}

// Mes alertes de recherche et leurs nouveautés de la semaine
export function useMesAlertes() {
  const { session } = useSession()
  return useQuery({
    queryKey: ['tableau-de-bord', 'alertes', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mes_alertes_keyli')
      if (error) throw error
      return data
    },
  })
}

// Visites à venir, que je les aie planifiées ou que je sois le visiteur
export function useVisitesAVenir(limite = 5) {
  const { session } = useSession()
  return useQuery({
    queryKey: ['tableau-de-bord', 'visites', session?.user.id, limite],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mes_visites_a_venir_keyli', { p_limite: limite })
      if (error) throw error
      return data
    },
  })
}

// Quartiers les plus recherchés (calcul nocturne, lecture publique)
export function useTendancesQuartiers(limite = 5) {
  return useQuery({
    queryKey: ['tableau-de-bord', 'tendances', limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quartiers_tendance_keyli')
        .select('zone_id, nom, score_popularite, tendance_location_pct, prix_fiable, communes_keyli(nom)')
        .eq('niveau', 'quartier')
        .gt('score_popularite', 0)
        .order('score_popularite', { ascending: false })
        .limit(limite)
      if (error) throw error
      return data
    },
  })
}
