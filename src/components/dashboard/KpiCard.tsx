import type { CSSProperties, ReactNode } from 'react'
import { useCountUp } from '@/hooks/useCountUp'
import { Sparkline } from '@/components/dashboard/Sparkline'
import { cn } from '@/lib/utils'

const formatParDefaut = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))

// Carte d'indicateur (docs/KEYLI_DASHBOARD_DESIGN_SPEC.md) : libellé, valeur,
// et, si une cible du PRD existe, son état. Valeur numérique : compteur
// 0 → valeur au premier chargement (useCountUp). Apparition en cascade
// (`rang` = position de la carte, décalage de 60 ms). Mini-graphique
// optionnel (`serie`) et badge de variation (`variation`).
export function KpiCard({
  libelle,
  valeur,
  nombre,
  formater = formatParDefaut,
  detail,
  cible,
  atteinte,
  rang = 0,
  serie,
  variation,
}: {
  libelle: string
  valeur?: ReactNode // valeur déjà mise en forme (texte), sans compteur
  nombre?: number | null // valeur numérique animée
  formater?: (n: number) => string
  detail?: ReactNode
  cible?: string
  atteinte?: boolean | null
  rang?: number
  serie?: number[] // évolution récente (mini-graphique)
  // Variation sur la période : ▲ vert si hausse, ▼ rouge si baisse
  // (DESIGN_SYSTEM.md) — ex. { valeur: 14, unite: '%' } ou { valeur: 0.2 }
  variation?: { valeur: number; unite?: string } | null
}) {
  const anime = useCountUp(nombre)
  const affichage = nombre === undefined ? valeur : anime === null ? '—' : formater(anime)

  return (
    <div
      className="kf-cascade rounded-lg border bg-card p-5 shadow-sm"
      style={{ '--kf-delai': `${rang * 60}ms` } as CSSProperties}
    >
      <p className="text-sm text-muted-foreground">{libelle}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <p className="text-3xl font-bold tabular-nums tracking-tight">{affichage}</p>
        {variation && <BadgeVariation {...variation} />}
      </div>
      {serie && serie.length > 1 && (
        <Sparkline points={serie} etire hauteur={32} className="mt-3" libelle={`Évolution : ${libelle}`} />
      )}
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

function BadgeVariation({ valeur, unite = '' }: { valeur: number; unite?: string }) {
  const hausse = valeur > 0
  const nulle = valeur === 0
  const texte = `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Math.abs(valeur))}${unite ? ` ${unite}` : ''}`
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-pill px-2 py-0.5 text-xs font-semibold tabular-nums',
        nulle ? 'bg-muted text-muted-foreground' : hausse ? 'bg-success/15 text-success' : 'bg-destructive/10 text-destructive',
      )}
    >
      <span aria-hidden>{nulle ? '=' : hausse ? '▲' : '▼'}</span>
      <span className="sr-only">{nulle ? 'stable' : hausse ? 'en hausse de' : 'en baisse de'}</span>
      {texte}
    </span>
  )
}
