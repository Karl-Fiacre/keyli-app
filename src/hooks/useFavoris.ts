import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { enregistrerInteraction } from '@/hooks/useRecherche'
import type { ResumeAnnonce } from '@/components/annonce/CarteAnnonce'

// Identifiants des annonces en favori (cœur plein sur les cartes et la fiche)
export function useIdsFavoris() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['favoris', 'ids', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('favorites_keyli').select('property_id')
      if (error) throw error
      return new Set(data.map((f) => f.property_id))
    },
  })
}

// Bascule : un clic ajoute, un second retire (unicité garantie en base).
// L'ajout est aussi tracé comme interaction « click_favorite »
// (docs/MODULES/annonces.md : état actuel ≠ historique d'événements).
export function useBasculerFavori() {
  const { session } = useSession()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ propertyId, actif }: { propertyId: string; actif: boolean }) => {
      const userId = session?.user.id
      if (!userId) throw new Error('Connectez-vous pour enregistrer un favori.')
      if (actif) {
        const { error } = await supabase.from('favorites_keyli').delete().eq('property_id', propertyId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('favorites_keyli').insert({ user_id: userId, property_id: propertyId })
        // 23505 : déjà en favori (double clic, autre onglet) — l'état voulu est atteint
        if (error && error.code !== '23505') throw error
        void enregistrerInteraction(propertyId, 'click_favorite')
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['favoris'] }),
  })
}

export interface Favori {
  propertyId: string
  ajouteLe: string | null
  annonce: ResumeAnnonce | null // null : annonce archivée ou masquée (plus visible)
}

// Mes favoris, du plus récent au plus ancien ; une annonce qui n'est plus
// visible (RLS) reste listée pour pouvoir la retirer
export function useMesFavoris() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['favoris', 'liste', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Favori[]> => {
      const { data, error } = await supabase
        .from('favorites_keyli')
        .select(
          'property_id, created_at, properties_keyli(id, title, type, status, price, city, rooms, main_image_url, is_verified, quartiers_keyli(nom, communes_keyli(nom)))',
        )
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map((f) => {
        const p = f.properties_keyli
        return {
          propertyId: f.property_id,
          ajouteLe: f.created_at,
          annonce: p
            ? {
                id: p.id,
                titre: p.title,
                type: p.type,
                statut: p.status,
                prix: Number(p.price),
                ville: p.city,
                quartier: p.quartiers_keyli?.nom ?? null,
                commune: p.quartiers_keyli?.communes_keyli?.nom ?? null,
                pieces: p.rooms,
                image: p.main_image_url,
                verifiee: !!p.is_verified,
              }
            : null,
        }
      })
    },
  })
}
