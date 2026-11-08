import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { enregistrerInteraction } from '@/partage/hooks/useRecherche'
import type { ResumeAnnonce } from '@/partage/lib/annonce'

// Conversion « vue d'annonce → prise de contact » (Sprint 8,
// docs/MODULES/conversion.md). Définitions communes, calculées par la base :
// visiteurs (session × annonce ayant vu la fiche), intentions (clic
// « contacter »), contacts (premier message d'un chercheur sur une annonce).

// Intention de contact : clic sur un bouton « Contacter » ou envoi du
// premier message. Un échec ne gêne jamais l'utilisateur.
export function signalerIntentionContact(propertyId: string) {
  void enregistrerInteraction(propertyId, 'click_contact').catch(() => undefined)
}

// ---------- Back-office : taux sur une période ----------
export function useConversion(debut: string, fin: string) {
  return useQuery({
    queryKey: ['admin', 'conversion', debut, fin],
    enabled: !!debut && !!fin && debut <= fin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('conversion_annonces_keyli', { p_debut: debut, p_fin: fin })
      if (error) throw error
      return data
    },
  })
}

// ---------- Annonceur : statistiques et qualité de chaque annonce ----------
export function usePerformanceAnnonces(jours: number) {
  return useQuery({
    queryKey: ['performance-annonces', jours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('performance_mes_annonces_keyli', { p_jours: jours })
      if (error) throw error
      return data
    },
  })
}

// ---------- Fiche annonce : annonces similaires ----------
export function useAnnoncesSimilaires(id: string | undefined) {
  return useQuery({
    queryKey: ['annonces-similaires', id],
    enabled: !!id,
    queryFn: async (): Promise<ResumeAnnonce[]> => {
      const { data, error } = await supabase.rpc('annonces_similaires_keyli', { p_id: id as string, p_limite: 4 })
      if (error) throw error
      return data.map((a) => ({ ...a, prix: Number(a.prix) }))
    },
  })
}
