import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Double authentification des comptes admin et super_admin
// (docs/MODULES/admin.md). La base n'accorde les pouvoirs d'administration
// qu'à une session de niveau « aal2 » (est_admin_keyli) : ces hooks servent
// seulement à guider l'admin pour enrôler puis valider son second facteur
// (application d'authentification, code TOTP à 6 chiffres).

const CLE_NIVEAU = ['double-auth', 'niveau'] as const

export type EtatDoubleAuth =
  // Session déjà vérifiée : pouvoirs d'admin actifs
  | { etape: 'verifiee' }
  // Un facteur existe : demander le code de l'application
  | { etape: 'a_verifier'; facteurId: string }
  // Aucun facteur vérifié : proposer l'enrôlement
  | { etape: 'a_enroler' }

// Où en est la session courante
export function useEtatDoubleAuth(actif = true) {
  return useQuery({
    queryKey: CLE_NIVEAU,
    enabled: actif,
    queryFn: async (): Promise<EtatDoubleAuth> => {
      const niveau = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (niveau.error) throw niveau.error
      if (niveau.data.currentLevel === 'aal2') return { etape: 'verifiee' }
      const facteurs = await supabase.auth.mfa.listFactors()
      if (facteurs.error) throw facteurs.error
      // `totp` ne contient que les facteurs vérifiés
      const facteur = facteurs.data.totp[0]
      return facteur ? { etape: 'a_verifier', facteurId: facteur.id } : { etape: 'a_enroler' }
    },
    staleTime: 0,
  })
}

export interface EnrolementTotp {
  facteurId: string
  // Image SVG (data URL) du QR code à scanner
  qrCode: string
  // Clé à saisir à la main si le scan est impossible
  secret: string
}

// Démarre l'enrôlement : retire d'abord un éventuel facteur non terminé
// (enrôlement abandonné), sinon Supabase refuse d'en créer un nouveau
export function useDemarrerEnrolement() {
  return useMutation({
    mutationFn: async (): Promise<EnrolementTotp> => {
      const facteurs = await supabase.auth.mfa.listFactors()
      if (facteurs.error) throw facteurs.error
      for (const f of facteurs.data.all) {
        if (f.status === 'unverified') {
          const retrait = await supabase.auth.mfa.unenroll({ factorId: f.id })
          if (retrait.error) throw retrait.error
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Keyli administration',
      })
      if (error) throw error
      return { facteurId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
    },
  })
}

// Valide un code à 6 chiffres (premier code après enrôlement, ou code de
// connexion). La session passe en aal2 : toutes les données admin sont
// rechargées avec les nouveaux droits.
export function useValiderCode() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ facteurId, code }: { facteurId: string; code: string }) => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: facteurId, code })
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries(),
  })
}
