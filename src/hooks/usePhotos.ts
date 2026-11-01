import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { envoyerPhotos } from '@/lib/cloudinary'

// Photos d'une annonce, dans l'ordre d'affichage (la première est la
// principale). Limites 1 à 10 et adresses Keyli contrôlées par la base.
export function usePhotosAnnonce(propertyId: string | null) {
  return useQuery({
    queryKey: ['photos-annonce', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_media_keyli')
        .select('id, url, order_index')
        .eq('property_id', propertyId as string)
        .eq('media_type', 'image')
        .order('order_index')
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

function useInvalider(propertyId: string) {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries({ queryKey: ['photos-annonce', propertyId] })
    client.invalidateQueries({ queryKey: ['mes-annonces'] })
    client.invalidateQueries({ queryKey: ['fiche-annonce', propertyId] })
  }
}

// Ajoute des photos à la fin de la liste
export function useAjouterPhotos(propertyId: string) {
  const invalider = useInvalider(propertyId)
  return useMutation({
    mutationFn: async ({
      fichiers,
      ordreDepart,
      surProgression,
    }: {
      fichiers: File[]
      ordreDepart: number
      surProgression?: (p: number) => void
    }) => {
      const adresses = await envoyerPhotos(fichiers, surProgression)
      const { error } = await supabase
        .from('property_media_keyli')
        .insert(
          adresses.map((url, i) => ({
            property_id: propertyId,
            media_type: 'image',
            url,
            order_index: ordreDepart + i,
          })),
        )
      if (error) throw error
    },
    onSettled: invalider,
  })
}

// Retire une photo (la base refuse de retirer la dernière)
export function useRetirerPhoto(propertyId: string) {
  const invalider = useInvalider(propertyId)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('property_media_keyli').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: invalider,
  })
}

// Enregistre un nouvel ordre (liste complète des identifiants)
export function useReordonnerPhotos(propertyId: string) {
  const invalider = useInvalider(propertyId)
  return useMutation({
    // Une seule écriture côté base : la photo principale reste cohérente
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.rpc('ordonner_photos_keyli', { p_property: propertyId, p_ids: ids })
      if (error) throw error
    },
    onSettled: invalider,
  })
}
