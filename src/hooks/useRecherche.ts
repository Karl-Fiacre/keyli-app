import { useEffect, useRef } from 'react'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { StatutBien, TypeBien } from '@/hooks/useAnnonces'
import type { Database } from '@/integrations/supabase/types'

export type TriRecherche = 'pertinence' | 'recent' | 'prix_croissant' | 'prix_decroissant'
export type TypeInteraction = Database['public']['Enums']['interaction_type_keyli']

export interface FiltresRecherche {
  statut?: StatutBien
  type?: TypeBien
  commune?: string
  quartier?: string
  prixMin?: number
  prixMax?: number
  piecesMin?: number
  meuble?: boolean
  avantages: string[]
  // Séjours courts : à la nuit seulement, libres entre ces dates
  sejour?: boolean
  arrivee?: string
  depart?: string
  voyageurs?: number
  tri: TriRecherche
  page: number
}

export const TAILLE_PAGE = 20

// Recherche par filtres — la base filtre, trie et ne renvoie que les annonces
// visibles du public (rechercher_annonces_keyli, RLS)
export function useRecherche(f: FiltresRecherche) {
  return useQuery({
    queryKey: ['recherche', f],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rechercher_annonces_keyli', {
        p_statut: f.statut,
        p_type: f.type,
        p_commune: f.commune,
        p_quartier: f.quartier,
        p_prix_min: f.prixMin,
        p_prix_max: f.prixMax,
        p_pieces_min: f.piecesMin,
        p_meuble: f.meuble,
        p_avantages: f.avantages,
        p_tri: f.tri,
        p_limite: TAILLE_PAGE,
        p_decalage: (f.page - 1) * TAILLE_PAGE,
        p_sejour: f.sejour,
        p_arrivee: f.arrivee,
        p_depart: f.depart,
        p_voyageurs: f.voyageurs,
      })
      if (error) throw error
      return { annonces: data, total: Number(data[0]?.total ?? 0) }
    },
  })
}

// Communes (filtre « commune »), liste fermée
export function useCommunes() {
  return useQuery({
    queryKey: ['communes'],
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('communes_keyli').select('id, nom').order('nom')
      if (error) throw error
      return data
    },
  })
}

// Fiche d'annonce : annonce, quartier, avantages, médias et profil public de
// l'annonceur (jamais son téléphone ni son email)
export function useFicheAnnonce(id: string | undefined) {
  return useQuery({
    queryKey: ['fiche-annonce', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: annonce, error } = await supabase
        .from('properties_keyli')
        // Chaîne unique : le client Supabase en déduit le type du résultat
        .select(
          'id, owner_id, title, type, status, price, sejour_court, nuits_min, voyageurs_max, description, city, area_m2, rooms, bathrooms, furnished, main_image_url, is_verified, archived_at, created_at, quartiers_keyli(nom, communes_keyli(nom)), property_avantages_keyli(avantages_keyli(id, libelle, categorie, ordre)), property_media_keyli(id, url, media_type, order_index)',
        )
        .eq('id', id as string)
        .maybeSingle()
      if (error) throw error
      if (!annonce) return null
      const { data: annonceur, error: erreurProfil } = await supabase
        .from('profils_publics_keyli')
        .select('user_id, nom_affiche, photo_url, role_keyli, verified, rating_avg, membre_depuis')
        .eq('user_id', annonce.owner_id)
        .maybeSingle()
      if (erreurProfil) throw erreurProfil
      return { annonce, annonceur }
    },
  })
}

// Identifiant de session anonyme (statistiques de consultation,
// docs/MODULES/analytics-tracking.md) — conservé dans le navigateur
function identifiantSession(): string {
  const cle = 'keyli_session'
  try {
    const existant = localStorage.getItem(cle)
    if (existant) return existant
    const nouveau = crypto.randomUUID()
    localStorage.setItem(cle, nouveau)
    return nouveau
  } catch {
    return crypto.randomUUID()
  }
}

// Événement de consultation ou de clic ; l'auteur, le quartier et les
// compteurs sont fixés par la base. Un échec ne gêne jamais la navigation.
export async function enregistrerInteraction(propertyId: string, type: TypeInteraction, source?: string) {
  await supabase.from('property_interactions_keyli').insert({
    property_id: propertyId,
    interaction_type: type,
    session_id: identifiantSession(),
    source: source ?? null,
  })
}

// Une vue par affichage de fiche (la base ignore les rafraîchissements
// rapprochés de la même session)
export function useVueAnnonce(id: string | undefined, source?: string) {
  const envoyee = useRef<string | null>(null)
  useEffect(() => {
    if (!id || envoyee.current === id) return
    envoyee.current = id
    void enregistrerInteraction(id, 'view', source)
  }, [id, source])
}

// Premier message à l'annonceur (messagerie Keyli, gratuite) : la base
// vérifie l'anti-démarchage et crée le lead
export function useContacterAnnonceur() {
  const { session } = useSession()
  return useMutation({
    mutationFn: async ({
      propertyId,
      destinataire,
      message,
    }: {
      propertyId: string
      destinataire: string
      message: string
    }) => {
      if (!session) throw new Error('Connectez-vous pour envoyer un message.')
      const { error } = await supabase.from('messages_keyli').insert({
        from_user: session.user.id,
        to_user: destinataire,
        property_id: propertyId,
        body: message,
      })
      if (error) throw error
      void enregistrerInteraction(propertyId, 'click_contact')
    },
  })
}

// Positions APPROXIMATIVES des annonces affichées (case d'environ 450 m,
// calculée par la base — la position exacte n'est jamais lisible par le
// client). Chargées seulement quand la vue carte est ouverte.
export function usePositionsAnnonces(ids: string[], actif: boolean) {
  return useQuery({
    queryKey: ['positions-annonces', ids],
    enabled: actif && ids.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('positions_annonces_keyli', { p_ids: ids })
      if (error) throw error
      return new Map(data.map((p) => [p.id, { lat: p.latitude, lng: p.longitude }]))
    },
  })
}
