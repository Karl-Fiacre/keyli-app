import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useProfil } from '@/hooks/useProfil'
import type { Database } from '@/integrations/supabase/types'

type Enums = Database['public']['Enums']
export type StatutDocument = Enums['document_status_keyli']
export type StatutSignalement = Enums['report_status_keyli']

// Confort d'interface uniquement : chaque lecture et action admin est
// contrôlée en base (est_admin_keyli), la vraie protection est là.
export function useEstAdmin() {
  const role = useProfil().data?.role_keyli
  return role === 'admin' || role === 'super_admin'
}

// Indicateurs de base (une ligne)
export function useIndicateurs() {
  return useQuery({
    queryKey: ['admin', 'indicateurs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_indicateurs_keyli').single()
      if (error) throw error
      return data
    },
  })
}

// Activité quotidienne des 30 derniers jours (mini-graphiques)
export function useActiviteQuotidienne() {
  return useQuery({
    queryKey: ['admin', 'activite'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_activite_quotidienne_keyli', { p_jours: 30 })
      if (error) throw error
      return data
    },
  })
}

// File de vérification par statut (en attente : les plus anciens d'abord)
export function useFileVerification(statut: StatutDocument) {
  return useQuery({
    queryKey: ['admin', 'verification', statut],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_file_verification_keyli', { p_statut: statut })
      if (error) throw error
      return data
    },
  })
}

// Lien temporaire (5 min) vers un fichier du bucket privé — lecture admin
// autorisée par la policy du bucket
export async function ouvrirDocument(chemin: string) {
  const { data, error } = await supabase.storage.from('documents_keyli').createSignedUrl(chemin, 300)
  if (error || !data) throw error ?? new Error('Document introuvable')
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

function useInvaliderAdmin() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['admin'] })
}

// Approuver / rejeter (motif obligatoire au rejet) — fonction auditée
export function useReviserDocument() {
  const invalider = useInvaliderAdmin()
  return useMutation({
    mutationFn: async ({ id, decision, notes }: { id: string; decision: 'approved' | 'rejected'; notes?: string }) => {
      const { error } = await supabase.rpc('admin_reviser_document_keyli', {
        p_document: id,
        p_decision: decision,
        p_notes: notes?.trim() || undefined,
      })
      if (error) throw error
    },
    onSuccess: invalider,
  })
}

// File de modération par statut
export function useFileSignalements(statut: StatutSignalement) {
  return useQuery({
    queryKey: ['admin', 'signalements', statut],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_file_signalements_keyli', { p_statut: statut })
      if (error) throw error
      return data
    },
  })
}

// Actions de modération, toutes auditées en base
export function useModeration() {
  const invalider = useInvaliderAdmin()
  const traiter = useMutation({
    mutationFn: async ({ id, statut, note }: { id: string; statut: 'reviewed' | 'resolved'; note?: string }) => {
      const { error } = await supabase.rpc('admin_traiter_signalement_keyli', {
        p_report: id,
        p_statut: statut,
        p_note: note?.trim() || undefined,
      })
      if (error) throw error
    },
    onSuccess: invalider,
  })
  const retirerVerificationBien = useMutation({
    mutationFn: async ({ propertyId, motif }: { propertyId: string; motif: string }) => {
      const { error } = await supabase.rpc('admin_retirer_verification_bien_keyli', {
        p_property: propertyId,
        p_motif: motif,
      })
      if (error) throw error
    },
    onSuccess: invalider,
  })
  const suspendre = useMutation({
    mutationFn: async ({ userId, motif }: { userId: string; motif: string }) => {
      const { error } = await supabase.rpc('admin_suspendre_compte_keyli', { p_user: userId, p_motif: motif })
      if (error) throw error
    },
    onSuccess: invalider,
  })
  return { traiter, retirerVerificationBien, suspendre }
}
