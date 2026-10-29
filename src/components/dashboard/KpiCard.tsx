import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Carte d'indicateur (docs/KEYLI_DASHBOARD_DESIGN_SPEC.md) : libellé, valeur,
// et, si une cible du PRD existe, son état (atteinte ou non). Version de base
// pour le back-office ; compteur animé et sparkline viendront avec les
// dashboards enrichis (Sem. 11-13).
export function KpiCard({
  libelle,
  valeur,
  detail,
  cible,
  atteinte,
}: {
  libelle: string
  valeur: ReactNode
  detail?: ReactNode
  cible?: string
  atteinte?: boolean | null
}) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{libelle}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{valeur}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      {cible && (
        <p
          className={cn(
            'mt-3 inline-block rounded-pill px-2.5 py-0.5 text-xs font-semibold',
            atteinte === true && 'bg-success/15 text-success',
            atteinte === false && 'bg-pending/15 text-pending',
            atteinte == null && 'bg-muted text-muted-foreground',
          )}
        >
          Cible pilote : {cible}
        </p>
      )}
    </div>
  )
}
