import type { CSSProperties, ReactNode } from 'react'

// Ligne libellé + barre de progression + pourcentage (KEYLI_DASHBOARD_DESIGN_SPEC.md
// §2) : comparaison de prix (propriétaire), tendance de quartier (chercheur),
// progression vers une cible (admin). La barre grandit de 0 à sa valeur au
// premier affichage, décalage de 80 ms par ligne (`rang`, classe kf-barre).
export function TrendBar({
  libelle,
  pourcentage,
  valeurAffichee,
  couleur = 'hsl(var(--primary-glow))',
  rang = 0,
}: {
  libelle: ReactNode
  pourcentage: number // 0 à 100 (borné)
  valeurAffichee?: ReactNode // par défaut « 42 % »
  couleur?: string // valeur CSS issue d'un token
  rang?: number
}) {
  const p = Math.max(0, Math.min(100, Number.isFinite(pourcentage) ? pourcentage : 0))
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">{libelle}</span>
        <span className="shrink-0 font-semibold tabular-nums">{valeurAffichee ?? `${Math.round(p)} %`}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-pill bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p)}
        aria-label={typeof libelle === 'string' ? libelle : undefined}
      >
        <div
          className="kf-barre h-full rounded-pill"
          style={{ width: `${p}%`, background: couleur, '--kf-delai': `${rang * 80}ms` } as CSSProperties}
        />
      </div>
    </div>
  )
}
