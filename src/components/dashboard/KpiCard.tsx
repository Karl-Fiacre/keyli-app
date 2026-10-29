import type { CSSProperties, ReactNode } from 'react'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

const formatParDefaut = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

// Carte d'indicateur (docs/KEYLI_DASHBOARD_DESIGN_SPEC.md) : libellé, valeur,
// et, si une cible du PRD existe, son état. Valeur numérique : compteur
// 0 → valeur au premier chargement (useCountUp). Apparition en cascade
// (`rang` = position de la carte, décalage de 60 ms). Variation et sparkline
// viendront avec les primitives visuelles (Sem. 12-13).
export function KpiCard({
  libelle,
  valeur,
  nombre,
  formater = formatParDefaut,
  detail,
  cible,
  atteinte,
  rang = 0,
}: {
  libelle: string
  valeur?: ReactNode // valeur déjà mise en forme (texte), sans compteur
  nombre?: number | null // valeur numérique animée
  formater?: (n: number) => string
  detail?: ReactNode
  cible?: string
  atteinte?: boolean | null
  rang?: number
}) {
  const anime = useCountUp(nombre)
  const affichage = nombre === undefined ? valeur : anime === null ? '—' : formater(anime)

  return (
    <div
      className="kf-cascade rounded-lg border bg-card p-5 shadow-sm"
      style={{ '--kf-delai': `${rang * 60}ms` } as CSSProperties}
    >
      <p className="text-sm text-muted-foreground">{libelle}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{affichage}</p>
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
