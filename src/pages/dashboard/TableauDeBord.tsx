import { Navigate } from 'react-router-dom'
import { useProfil } from '@/hooks/useProfil'
import AgencyDashboard from '@/pages/dashboard/AgencyDashboard'
import OwnerDashboard from '@/pages/dashboard/OwnerDashboard'
import UserDashboard from '@/pages/dashboard/UserDashboard'

// Point d'entrée /tableau-de-bord : le dashboard dépend du rôle du compte.
export default function TableauDeBord() {
  const profil = useProfil()
  if (profil.isPending) return <p className="py-16 text-center text-muted-foreground">Chargement…</p>
  if (profil.isError || !profil.data)
    return <p className="py-16 text-center text-destructive-texte">Impossible de charger votre profil.</p>

  const p = profil.data
  switch (p.role_keyli) {
    case 'owner':
      return <OwnerDashboard profil={p} />
    case 'agency':
      return <AgencyDashboard profil={p} />
    case 'admin':
    case 'super_admin':
      return <Navigate to="/admin" replace />
    default:
      return <UserDashboard profil={p} />
  }
}
