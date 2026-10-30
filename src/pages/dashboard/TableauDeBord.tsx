import { Navigate } from 'react-router-dom'
import { useProfil } from '@/hooks/useProfil'
import OwnerDashboard from '@/pages/dashboard/OwnerDashboard'
import UserDashboard from '@/pages/dashboard/UserDashboard'

// Point d'entrée /tableau-de-bord : le dashboard dépend du rôle du compte.
// L'agence utilise provisoirement celui du propriétaire (mêmes données :
// ses annonces, ses contacts) jusqu'à son dashboard dédié (semaine 17).
export default function TableauDeBord() {
  const profil = useProfil()
  if (profil.isPending) return <p className="container py-16 text-center text-muted-foreground">Chargement…</p>
  if (profil.isError || !profil.data)
    return <p className="container py-16 text-center text-destructive">Impossible de charger votre profil.</p>

  const p = profil.data
  switch (p.role_keyli) {
    case 'owner':
    case 'agency':
      return <OwnerDashboard profil={p} />
    case 'admin':
    case 'super_admin':
      return <Navigate to="/admin" replace />
    default:
      return <UserDashboard profil={p} />
  }
}
