import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/partage/hooks/useSession'
import type { Database } from '@/integrations/supabase/types'

// Séjours courts et demandes de réservation (docs/MODULES/reservations.md).
// Disponibilité, prix et total sont TOUJOURS calculés par la base
// (devis_sejour_keyli) : l'écran ne fait qu'afficher.

export type StatutReservation = Database['public']['Enums']['reservation_status_keyli']

export interface ParametresSejour {
  propertyId: string
  chambreId: string | null
  arrivee: string | null
  depart: string | null
  voyageurs: number
  chambres: number
}

// Types de chambres actifs d'un hôtel ou d'une auberge
export function useTypesChambres(propertyId: string | undefined, tous = false) {
  return useQuery({
    queryKey: ['types-chambres', propertyId, tous],
    enabled: !!propertyId,
    queryFn: async () => {
      let requete = supabase
        .from('types_chambres_keyli')
        .select('id, nom, description, quantite, prix_nuit, voyageurs_max, actif')
        .eq('property_id', propertyId as string)
        .order('prix_nuit')
      if (!tous) requete = requete.eq('actif', true)
      const { data, error } = await requete
      if (error) throw error
      return data
    },
  })
}

// Nuits complètes (grisées dans le calendrier), sur une fenêtre de dates
export function useNuitsCompletes(propertyId: string, chambreId: string | null, de: string, a: string, actif = true) {
  return useQuery({
    queryKey: ['nuits-completes', propertyId, chambreId, de, a],
    enabled: actif,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('nuits_completes_keyli', {
        p_property: propertyId,
        p_chambre: chambreId as string,
        p_de: de,
        p_a: a,
      })
      if (error) throw error
      return new Set((data ?? []) as string[])
    },
  })
}

// Devis calculé par la base : nuits, prix par nuit, total, chambres restantes,
// motif si le séjour n'est pas réservable
export function useDevisSejour(p: ParametresSejour, actif = true) {
  return useQuery({
    queryKey: ['devis-sejour', p],
    enabled: actif && !!p.arrivee && !!p.depart,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('devis_sejour_keyli', {
        p_property: p.propertyId,
        p_chambre: p.chambreId as string,
        p_arrivee: p.arrivee as string,
        p_depart: p.depart as string,
        p_voyageurs: p.voyageurs,
        p_chambres: p.chambres,
      })
      if (error) throw error
      return data?.[0] ?? null
    },
  })
}

function useInvaliderReservations() {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries({ queryKey: ['reservations'] })
    client.invalidateQueries({ queryKey: ['devis-sejour'] })
    client.invalidateQueries({ queryKey: ['nuits-completes'] })
    client.invalidateQueries({ queryKey: ['notifications'] })
  }
}

export function useDemanderReservation() {
  const invalider = useInvaliderReservations()
  return useMutation({
    mutationFn: async (p: ParametresSejour & { message: string }) => {
      const { data, error } = await supabase.rpc('demander_reservation_keyli', {
        p_property: p.propertyId,
        p_chambre: p.chambreId as string,
        p_arrivee: p.arrivee as string,
        p_depart: p.depart as string,
        p_voyageurs: p.voyageurs,
        p_chambres: p.chambres,
        p_message: p.message,
      })
      if (error) throw error
      return data
    },
    onSuccess: invalider,
  })
}

const CHAMPS_RESERVATION =
  'id, property_id, chambre_id, voyageur_id, owner_id, date_arrivee, date_depart, nuits, voyageurs, nb_chambres, prix_nuit, montant_total, statut, message, motif, annulee_par, created_at, properties_keyli(title, main_image_url, city), types_chambres_keyli(nom)'

// Mes séjours (voyageur) ou demandes reçues (hôte), plus récentes d'abord
export function useReservations(sens: 'voyageur' | 'hote') {
  const { session } = useSession()
  const uid = session?.user.id
  return useQuery({
    queryKey: ['reservations', sens, uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations_keyli')
        .select(CHAMPS_RESERVATION)
        .eq(sens === 'voyageur' ? 'voyageur_id' : 'owner_id', uid as string)
        .order('date_arrivee', { ascending: true })
        .limit(200)
      if (error) throw error
      return data
    },
  })
}

export type Reservation = NonNullable<ReturnType<typeof useReservations>['data']>[number]

// Nom affiché des voyageurs d'une liste de demandes (profil public)
export function useNomsVoyageurs(ids: string[]) {
  return useQuery({
    queryKey: ['noms-voyageurs', [...ids].sort()],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profils_publics_keyli')
        .select('user_id, nom_affiche')
        .in('user_id', ids)
      if (error) throw error
      return new Map((data ?? []).map((p) => [p.user_id as string, p.nom_affiche as string]))
    },
  })
}

export function useRepondreReservation() {
  const invalider = useInvaliderReservations()
  return useMutation({
    mutationFn: async ({ id, accepter, motif }: { id: string; accepter: boolean; motif?: string }) => {
      const { error } = await supabase.rpc('repondre_reservation_keyli', {
        p_reservation: id,
        p_accepter: accepter,
        p_motif: motif ?? '',
      })
      if (error) throw error
    },
    onSettled: invalider,
  })
}

export function useAnnulerReservation() {
  const invalider = useInvaliderReservations()
  return useMutation({
    mutationFn: async ({ id, motif }: { id: string; motif?: string }) => {
      const { error } = await supabase.rpc('annuler_reservation_keyli', { p_reservation: id, p_motif: motif ?? '' })
      if (error) throw error
    },
    onSettled: invalider,
  })
}

// Gestion des types de chambres (hôtelier)
export interface SaisieChambre {
  nom: string
  description: string
  quantite: number
  prix_nuit: number
  voyageurs_max: number
}

export function useEnregistrerChambre(propertyId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...c }: SaisieChambre & { id?: string; actif?: boolean }) => {
      const valeurs = { ...c, description: c.description.trim() || null }
      const { error } = id
        ? await supabase.from('types_chambres_keyli').update(valeurs).eq('id', id)
        : await supabase.from('types_chambres_keyli').insert({ ...valeurs, property_id: propertyId })
      if (error) throw error
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['types-chambres', propertyId] })
      client.invalidateQueries({ queryKey: ['mes-annonces'] })
    },
  })
}

export function useActiverChambre(propertyId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase.from('types_chambres_keyli').update({ actif }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['types-chambres', propertyId] }),
  })
}
