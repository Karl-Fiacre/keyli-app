import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { CRITERES_COMPARAISON, type CritereCompare } from '@/lib/dashboard'

export interface BienCompare {
  id: string
  titre: string
  vers?: string
  valeurs: Record<string, ReactNode> // valeur par clé de critère
}

// Tableau de comparaison : une colonne par bien sélectionné, une ligne par
// critère (KEYLI_DASHBOARD_DESIGN_SPEC.md §2). Défile horizontalement sur
// petit écran, la colonne des critères restant visible (sticky).
export function CompareTable({
  biens,
  criteres = CRITERES_COMPARAISON,
  onRetirer,
  vide = 'Sélectionnez des biens (favoris) pour les comparer.',
}: {
  biens: BienCompare[]
  criteres?: CritereCompare[]
  onRetirer?: (id: string) => void
  vide?: string
}) {
  if (biens.length === 0) return <p className="text-sm text-muted-foreground">{vide}</p>
  const cellule = (v: ReactNode, cle: string) => {
    if (cle === 'verifiee' && typeof v === 'boolean')
      return v ? <VerifiedBadge className="text-[11px]" /> : <span className="text-muted-foreground">Non</span>
    if (typeof v === 'boolean') return v ? 'Oui' : 'Non'
    return v ?? <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="bg-secondary/60">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-secondary px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Critère
            </th>
            {biens.map((b) => (
              <th key={b.id} scope="col" className="min-w-40 px-3 py-2 text-left align-top font-semibold">
                <div className="flex items-start justify-between gap-2">
                  {b.vers ? (
                    <Link to={b.vers} className="line-clamp-2 hover:underline">
                      {b.titre}
                    </Link>
                  ) : (
                    <span className="line-clamp-2">{b.titre}</span>
                  )}
                  {onRetirer && (
                    <button
                      type="button"
                      onClick={() => onRetirer(b.id)}
                      className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Retirer ${b.titre} de la comparaison`}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {criteres.map((c) => (
            <tr key={c.cle} className="border-t">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-muted-foreground"
              >
                {c.libelle}
              </th>
              {biens.map((b) => (
                <td key={b.id} className="px-3 py-2 tabular-nums">
                  {cellule(b.valeurs[c.cle], c.cle)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
