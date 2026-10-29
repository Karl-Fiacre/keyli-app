import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import type { Database } from '@/integrations/supabase/types'

export type TypeDocument = Database['public']['Enums']['document_type_keyli']
export type StatutDocument = Database['public']['Enums']['document_status_keyli']

// Limites appliquées par le bucket privé (refus côté serveur) ; vérifiées
// aussi ici pour un message clair avant l'envoi
export const TAILLE_MAX = 5 * 1024 * 1024
export const FORMATS = ['application/pdf', 'image/jpeg', 'image/png']

export const LIBELLES_DOCUMENT: Record<TypeDocument, string> = {
  extrait_naissance: 'Extrait de naissance',
  cert_residence: 'Certificat de résidence',
  registre: 'Registre de commerce (RCCM)',
  acd: 'ACD du bien (Arrêté de concession définitive)',
}

// Mes documents, le plus récent d'abord (RLS : les siens uniquement)
export function useMesDocuments() {
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['documents', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents_keyli')
        .select('id, doc_type, property_id, status, review_notes, created_at, reviewed_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

// Dernier document d'un type (et d'un bien pour l'ACD) : c'est son statut qui compte
export function dernierDocument<T extends { doc_type: string; property_id: string | null }>(
  documents: T[] | undefined,
  type: TypeDocument,
  propertyId: string | null = null,
) {
  return documents?.find((d) => d.doc_type === type && d.property_id === propertyId)
}

// Envoi : fichier dans son dossier du bucket privé, puis la ligne
// « en attente » que l'équipe Keyli examinera
export function useEnvoyerDocument() {
  const { session } = useSession()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ type, fichier, propertyId }: { type: TypeDocument; fichier: File; propertyId?: string }) => {
      const userId = session?.user.id
      if (!userId) throw new Error('Connexion requise.')
      if (!FORMATS.includes(fichier.type)) throw new Error('Format accepté : PDF, JPEG ou PNG.')
      if (fichier.size > TAILLE_MAX) throw new Error('Fichier trop lourd : 5 Mo au maximum.')
      const extension = fichier.type === 'application/pdf' ? 'pdf' : fichier.type === 'image/png' ? 'png' : 'jpg'
      const chemin = `${userId}/${type}-${crypto.randomUUID()}.${extension}`
      const envoi = await supabase.storage.from('documents_keyli').upload(chemin, fichier, { contentType: fichier.type })
      if (envoi.error) throw new Error('L\'envoi du fichier a échoué. Vérifiez votre connexion et réessayez.')
      const { error } = await supabase.from('documents_keyli').insert({
        user_id: userId,
        doc_type: type,
        file_url: chemin,
        property_id: propertyId ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export const MOTIFS_SIGNALEMENT = [
  ['fraude', 'Annonce frauduleuse ou arnaque'],
  ['indisponible', 'Bien déjà loué ou vendu'],
  ['informations_trompeuses', 'Prix ou informations trompeurs'],
  ['photos_non_conformes', 'Photos non conformes'],
  ['comportement', 'Comportement de l\'annonceur'],
  ['autre', 'Autre'],
] as const
export type MotifSignalement = (typeof MOTIFS_SIGNALEMENT)[number][0]

// Signaler une annonce (un seul signalement en attente par personne et par
// annonce, règle en base)
export function useSignaler() {
  const { session } = useSession()
  return useMutation({
    mutationFn: async ({ propertyId, motif, precision }: { propertyId: string; motif: MotifSignalement; precision: string }) => {
      const { error } = await supabase.from('reports_keyli').insert({
        reporter_id: session?.user.id as string,
        property_id: propertyId,
        motif,
        reason: precision.trim() || null,
      })
      if (error) {
        if (error.code === '23505') throw new Error('Vous avez déjà signalé cette annonce : l\'équipe Keyli l\'examine.')
        throw error
      }
    },
  })
}
