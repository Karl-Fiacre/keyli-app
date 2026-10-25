import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { Database } from '@/integrations/supabase/types'

export type TypeBien = Database['public']['Enums']['property_type_keyli']
export type StatutBien = Database['public']['Enums']['property_status_keyli']
export type Avantage = Database['public']['Tables']['avantages_keyli']['Row']

// État de la prochaine publication (compteur du cycle, dépassement, blocage).
// Calculé par la base — l'écran ne fait qu'afficher (docs/MODULES/annonces.md).
export function useEtatPublication() {
  const { session } = useSession()
  return useQuery({
    queryKey: ['etat-publication', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('etat_publication_keyli').single()
      if (error) throw error
      return data
    },
  })
}

// Avantages et proximités proposés (liste fermée, lecture publique)
export function useAvantages() {
  return useQuery({
    queryKey: ['avantages'],
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avantages_keyli')
        .select('*')
        .order('categorie')
        .order('ordre')
      if (error) throw error
      return data
    },
  })
}

// Quartiers avec leur commune — liste fermée qui change rarement
export function useQuartiers() {
  return useQuery({
    queryKey: ['quartiers'],
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('quartiers_keyli').select('id, nom, communes_keyli(nom)')
      if (error) throw error
      return data
        .map((q) => ({ id: q.id, nom: q.nom, commune: q.communes_keyli?.nom ?? '' }))
        .sort((a, b) => a.commune.localeCompare(b.commune, 'fr') || a.nom.localeCompare(b.nom, 'fr'))
    },
  })
}

export interface NouvelleAnnonce {
  titre: string
  type: TypeBien
  statut: StatutBien
  prix: number
  ville: string
  quartierId: string | null
  latitude: number
  longitude: number
  description?: string
  surface?: number
  pieces?: number
  sallesDeBain?: number
  meuble: boolean
  avantages: string[]
  accepteDepassement: boolean
}

// Publication atomique (annonce + avantages) — la base refait tous les
// contrôles du forfait (KY001 à KY004)
export function usePublierAnnonce() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (a: NouvelleAnnonce) => {
      const { data, error } = await supabase.rpc('publier_annonce_keyli', {
        p_titre: a.titre,
        p_type: a.type,
        p_statut: a.statut,
        p_prix: a.prix,
        p_ville: a.ville,
        p_quartier: a.quartierId ?? undefined,
        p_latitude: a.latitude,
        p_longitude: a.longitude,
        p_description: a.description || undefined,
        p_surface: a.surface,
        p_pieces: a.pieces,
        p_salles_de_bain: a.sallesDeBain,
        p_meuble: a.meuble,
        p_avantages: a.avantages,
        p_accepte_depassement: a.accepteDepassement,
      })
      if (error) throw error
      return data
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['etat-publication'] })
      client.invalidateQueries({ queryKey: ['mes-annonces'] })
    },
  })
}

// Annonces du compte connecté, archivées comprises (RLS « Propriétaire lit
// toutes ses annonces »)
export function useMesAnnonces() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['mes-annonces', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties_keyli')
        .select('id, title, type, status, price, city, archived_at, is_verified, created_at, quartiers_keyli(nom)')
        .eq('owner_id', userId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

// Jeton public Mapbox servi par l'Edge Function get-mapbox-token (jamais en
// dur dans le code). null si la carte n'est pas encore configurée.
export function useJetonMapbox() {
  return useQuery({
    queryKey: ['jeton-mapbox'],
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ jeton: string }>('get-mapbox-token')
      if (error || !data?.jeton) return null
      return data.jeton
    },
  })
}
