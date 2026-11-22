import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { DonneesInscription } from '@/partage/lib/validation'
import { VERSION_CGU } from '@/partage/lib/juridique'
import { plateforme } from '@/plateforme'

// Actions de compte (Supabase Auth). Les pages utilisent ces hooks, jamais
// le client Supabase directement (docs/CONVENTIONS.md).

const urlApp = plateforme.urlApp

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
            // Version des CGU acceptée : la base ne l'enregistre que si c'est celle en vigueur
            cgu_version: d.cgu ? VERSION_CGU : null,
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

// Connexion Google, Apple ou Facebook sur le web : Supabase redirige vers le
// fournisseur puis revient sur le site, où la session est lue dans l'adresse.
// (Le mobile a son propre parcours : apps/mobile/src/services/native/connexionSociale.ts)
export type FournisseurSocial = 'google' | 'apple' | 'facebook'

export function useConnexionFournisseur() {
  return useMutation({
    mutationFn: async ({ fournisseur, retour }: { fournisseur: FournisseurSocial; retour: string }) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: fournisseur,
        options: {
          redirectTo: urlApp(retour),
          scopes: fournisseur === 'facebook' ? 'email public_profile' : undefined,
        },
      })
      if (error) throw error
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

// Suppression du compte par son titulaire : tout se fait côté serveur
// (fonction Edge supprimer-compte), puis la session locale est fermée.
export const MOT_CONFIRMATION_SUPPRESSION = 'SUPPRIMER'

export function useSupprimerCompte() {
  return useMutation({
    mutationFn: async (confirmation: string) => {
      const { data, error } = await supabase.functions.invoke<{ supprime?: boolean; erreur?: string }>(
        'supprimer-compte',
        { body: { confirmation } },
      )
      if (error) {
        // Message métier renvoyé par la fonction (400, 403…)
        const contexte = (error as { context?: Response }).context
        const corps = contexte ? await contexte.json().catch(() => null) : null
        throw new Error(corps?.erreur ?? 'La suppression du compte a échoué. Réessayez ou contactez Keyli.')
      }
      if (!data?.supprime) throw new Error(data?.erreur ?? 'La suppression du compte a échoué.')
      // Le compte n'existe plus : fermeture locale seulement
      await supabase.auth.signOut({ scope: 'local' })
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
