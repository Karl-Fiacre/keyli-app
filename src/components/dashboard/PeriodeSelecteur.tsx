import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

// Sélecteur de période 7 j / 30 j / 90 j (KEYLI_DASHBOARD_DESIGN_SPEC.md
// §3.1). Le fond de l'onglet actif glisse vers le nouvel onglet (spec 5.3),
// transition CSS seule, neutralisée en mouvements réduits.
export function PeriodeSelecteur({
  periodes,
  valeur,
  onChange,
  libelle = 'Période',
}: {
  periodes: number[]
  valeur: number
  onChange: (jours: number) => void
  libelle?: string
}) {
  const index = Math.max(0, periodes.indexOf(valeur))
  return (
    <div
      role="radiogroup"
      aria-label={libelle}
      className="relative inline-grid rounded-pill border bg-secondary/60 p-1"
      style={{ gridTemplateColumns: `repeat(${periodes.length}, minmax(0, 1fr))` } as CSSProperties}
    >
      <span
        aria-hidden
        className="absolute bottom-1 left-1 top-1 rounded-pill bg-background shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: `calc((100% - 0.5rem) / ${periodes.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {periodes.map((j) => (
        <button
          key={j}
          type="button"
          role="radio"
          aria-checked={j === valeur}
          onClick={() => onChange(j)}
          className={cn(
            'relative z-10 rounded-pill px-3 py-1 text-xs font-semibold tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            j === valeur ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {j} j
        </button>
      ))}
    </div>
  )
}
