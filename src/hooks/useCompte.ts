import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { DonneesInscription } from '@/lib/validation'

// Actions de compte (Supabase Auth). Les pages utilisent ces hooks, jamais
// le client Supabase directement (docs/CONVENTIONS.md).

const urlApp = (chemin: string) => `${window.location.origin}${chemin}`

// Inscription : le rôle et l'identité partent dans les métadonnées ; le
// trigger handle_new_user_keyli crée le profil (admin refusé, nom d'agence
// obligatoire pour une agence — contrôlé aussi en base).
export function useInscription() {
  return useMutation({
    mutationFn: async (d: DonneesInscription) => {
      const { data, error } = await supabase.auth.signUp({
        email: d.email,
        password: d.motDePasse,
        options: {
          emailRedirectTo: urlApp('/verifier-email'),
          data: {
            role_keyli: d.role,
            first_name: d.prenom,
            last_name: d.nom,
            phone: d.telephone || null,
            nom_agence: d.role === 'agency' ? d.nomAgence : null,
          },
        },
      })
      if (error) throw error
      return data
    },
  })
}

export function useConnexion() {
  return useMutation({
    mutationFn: async ({ email, motDePasse }: { email: string; motDePasse: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
      if (error) throw error
      return data
    },
  })
}

export function useDeconnexion() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
  })
}

export function useRenvoiConfirmation() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: urlApp('/verifier-email') },
      })
      if (error) throw error
    },
  })
}

export function useDemandeReinitialisation() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: urlApp('/nouveau-mot-de-passe'),
      })
      if (error) throw error
    },
  })
}

export function useNouveauMotDePasse() {
  return useMutation({
    mutationFn: async (motDePasse: string) => {
      const { error } = await supabase.auth.updateUser({ password: motDePasse })
      if (error) throw error
    },
  })
}
