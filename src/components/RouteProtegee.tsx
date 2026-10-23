import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'

// Réserve une page aux comptes connectés. Confort d'interface uniquement :
// la vraie protection des données reste la RLS en base.
export function RouteProtegee({ children }: { children: ReactNode }) {
  const { session, chargement } = useSession()
  const emplacement = useLocation()

  if (chargement) {
    return <p className="container py-16 text-center text-muted-foreground">Chargement…</p>
  }
  if (!session) {
    return <Navigate to="/connexion" replace state={{ depuis: emplacement.pathname }} />
  }
  return <>{children}</>
}
