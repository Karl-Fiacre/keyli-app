export interface SegmentDonut {
  libelle: string
  valeur: number
  couleur: string // valeur CSS issue d'un token, ex. 'hsl(var(--success))'
}

const nombre = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

// Anneau en conic-gradient + légende (KEYLI_DASHBOARD_DESIGN_SPEC.md §2) :
// sans librairie. Apparition : fondu + scale(0.9 → 1), pas de balayage
// (spec 5.3). Accessible : la légende donne chaque valeur et sa part.
export function DonutChart({
  segments,
  titreCentre,
  taille = 140,
}: {
  segments: SegmentDonut[]
  titreCentre?: string // ex. « annonces »
  taille?: number
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.valeur), 0)
  let cumul = 0
  const parts = segments.map((s) => {
    const debut = total ? (cumul / total) * 360 : 0
    cumul += Math.max(0, s.valeur)
    const fin = total ? (cumul / total) * 360 : 0
    return `${s.couleur} ${debut.toFixed(2)}deg ${fin.toFixed(2)}deg`
  })
  const fond = total ? `conic-gradient(${parts.join(', ')})` : 'hsl(var(--secondary))'

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        className="kf-donut relative shrink-0 rounded-pill"
        style={{ width: taille, height: taille, background: fond }}
        aria-hidden
      >
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-pill bg-card">
          <span className="text-2xl font-bold tabular-nums">{nombre(total)}</span>
          {titreCentre && <span className="text-xs text-muted-foreground">{titreCentre}</span>}
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {segments.map((s) => (
          <li key={s.libelle} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-pill" style={{ background: s.couleur }} aria-hidden />
            <span>{s.libelle}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums">{nombre(s.valeur)}</span>
            <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
              {total ? `${Math.round((s.valeur / total) * 100)} %` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
