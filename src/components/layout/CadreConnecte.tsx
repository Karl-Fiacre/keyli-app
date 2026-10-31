import { Outlet, useNavigate } from 'react-router-dom'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { useProfil } from '@/hooks/useProfil'
import { useMessagesNonLus, useMessagesTempsReel } from '@/hooks/useMessagerie'
import { navigationParRole } from '@/lib/navigation'

// Cadre de l'espace connecté : barre latérale selon le rôle + barre du haut
// (cloche, profil, déconnexion), autour de chaque page protégée. Remplace
// l'en-tête public pour ces pages (décision du porteur, 2026-10-31).
export function CadreConnecte() {
  const naviguer = useNavigate()
  const profil = useProfil().data
  // Messagerie : nouveaux messages en temps réel, pastille des non-lus
  useMessagesTempsReel()
  const nonLus = useMessagesNonLus().data ?? 0
  const nav = navigationParRole(profil?.role_keyli, nonLus)

  const nom = profil
    ? profil.role_keyli === 'agency'
      ? profil.nom_agence || 'Mon agence'
      : [profil.first_name, profil.last_name].filter(Boolean).join(' ') || 'Mon compte'
    : ''

  return (
    <DashboardShell
      navigation={{ variante: nav.variante, sections: nav.sections }}
      barre={{
        nom,
        role: profil ? nav.libelleRole : '',
        photo: profil?.photo_url,
        // Recherche rapide : pour le chercheur, ouvre la page Recherche
        recherche:
          profil?.role_keyli === 'user'
            ? { placeholder: 'Rechercher un quartier, un type de bien…', onRecherche: () => naviguer('/recherche') }
            : undefined,
      }}
    >
      <Outlet />
    </DashboardShell>
  )
}
