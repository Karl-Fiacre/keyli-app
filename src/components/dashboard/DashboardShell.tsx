import type { ComponentProps, ReactNode } from 'react'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar'

// Cadre commun des dashboards : barre latérale + barre du haut + contenu.
// Chaque page de dashboard (Agence, Propriétaire, Chercheur) le compose avec
// sa propre navigation ; aucune donnée en dur ici.
export function DashboardShell({
  navigation,
  barre,
  children,
}: {
  navigation: ComponentProps<typeof DashboardSidebar>
  barre: ComponentProps<typeof DashboardTopbar>
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-secondary/40">
      <DashboardSidebar {...navigation} affichage="colonne" />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar {...barre} />
        <DashboardSidebar {...navigation} affichage="barre" />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
