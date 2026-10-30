import { useId } from 'react'
import { cn } from '@/lib/utils'

// Mini-graphique en ligne (KEYLI_DASHBOARD_DESIGN_SPEC.md §2) : SVG pur, sans
// librairie ; prend une série de points. Tracé animé au premier affichage
// (classe kf-trace, pathLength="1"). Couleur = un token de la charte.
export function Sparkline({
  points,
  couleur = 'hsl(var(--primary-glow))',
  largeur = 120,
  hauteur = 36,
  remplissage = true,
  className,
  libelle,
  etire = false,
}: {
  points: number[]
  couleur?: string // valeur CSS issue d'un token, ex. 'hsl(var(--success))'
  largeur?: number
  hauteur?: number
  remplissage?: boolean
  className?: string
  libelle?: string // texte accessible (ex. « Vues sur 30 jours, en hausse »)
  etire?: boolean // occupe toute la largeur du conteneur (trait d'épaisseur constante)
}) {
  // Identifiant du dégradé sans « : » (mal tolérés dans url(#…))
  const id = `sparkline-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  if (points.length < 2) return null

  const min = Math.min(...points)
  const max = Math.max(...points)
  const ecart = max - min || 1
  const marge = 2 // évite de couper l'épaisseur du trait aux bords
  const coord = points.map((v, i) => {
    const x = (i / (points.length - 1)) * largeur
    const y = marge + (1 - (v - min) / ecart) * (hauteur - 2 * marge)
    return [x, y] as const
  })
  const ligne = coord.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const aire = `${ligne} L${largeur},${hauteur} L0,${hauteur} Z`

  return (
    <svg
      viewBox={`0 0 ${largeur} ${hauteur}`}
      width={etire ? '100%' : largeur}
      height={hauteur}
      preserveAspectRatio={etire ? 'none' : undefined}
      className={cn('overflow-visible', className)}
      role={libelle ? 'img' : undefined}
      aria-label={libelle}
      aria-hidden={libelle ? undefined : true}
    >
      {remplissage && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={couleur} stopOpacity={0.18} />
              <stop offset="100%" stopColor={couleur} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={aire} fill={`url(#${id})`} className="kf-donut" />
        </>
      )}
      <path
        d={ligne}
        pathLength={1}
        fill="none"
        stroke={couleur}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="kf-trace"
      />
    </svg>
  )
}
