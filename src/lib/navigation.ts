import { CreditCard, Heart, Home, LayoutGrid, MessageSquare, Search, Shield, UserRound } from 'lucide-react'
import type { SectionNav } from '@/components/dashboard/DashboardSidebar'
import type { Database } from '@/integrations/supabase/types'

type Role = Database['public']['Enums']['user_role_keyli']

// Navigation de l'espace connecté, par rôle (KEYLI_DASHBOARD_DESIGN_SPEC.md
// §3). Décision du porteur (2026-10-31) : toutes les pages de l'espace
// connecté s'affichent dans le cadre du tableau de bord ; Accueil, Recherche
// et fiche d'annonce gardent l'en-tête public.
export function navigationParRole(
  role: Role | undefined,
  messagesNonLus: number,
): {
  variante: 'claire' | 'sombre'
  sections: SectionNav[]
  libelleRole: string
} {
  const messages = {
    vers: '/messages',
    libelle: 'Messages',
    icone: MessageSquare,
    badge: messagesNonLus || undefined,
  }
  const accueil = { vers: '/tableau-de-bord', libelle: "Vue d'ensemble", icone: LayoutGrid, fin: true }
  const rechercher = { vers: '/recherche', libelle: 'Rechercher', icone: Search }
  const profil = { vers: '/profil', libelle: 'Mon profil', icone: UserRound }

  switch (role) {
    case 'agency':
      return {
        variante: 'sombre',
        libelleRole: 'Compte Agence',
        sections: [
          { entrees: [accueil, { vers: '/annonces', libelle: 'Annonces', icone: Home }, messages, rechercher] },
          {
            titre: 'Compte',
            entrees: [
              { vers: '/abonnement', libelle: 'Facturation', icone: CreditCard },
              { ...profil, libelle: 'Paramètres' },
            ],
          },
        ],
      }
    case 'owner':
      return {
        variante: 'claire',
        libelleRole: 'Compte Propriétaire',
        sections: [
          {
            entrees: [
              accueil,
              { vers: '/annonces', libelle: 'Mes biens', icone: Home },
              messages,
              { vers: '/abonnement', libelle: 'Abonnement', icone: CreditCard },
              rechercher,
            ],
          },
          { titre: 'Compte', entrees: [profil] },
        ],
      }
    case 'admin':
    case 'super_admin':
      return {
        variante: 'sombre',
        libelleRole: role === 'super_admin' ? 'Super administrateur' : 'Administrateur',
        sections: [
          { entrees: [{ vers: '/admin', libelle: 'Back-office', icone: Shield }, messages, rechercher] },
          { titre: 'Compte', entrees: [profil] },
        ],
      }
    default:
      return {
        variante: 'claire',
        libelleRole: 'Chercheur',
        sections: [
          {
            entrees: [accueil, rechercher, { vers: '/favoris', libelle: 'Favoris', icone: Heart }, messages],
          },
          { titre: 'Compte', entrees: [profil] },
        ],
      }
  }
}
