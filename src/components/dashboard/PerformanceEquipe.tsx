import type { CSSProperties } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LigneEquipe {
  id: string
  nom: string
  actif: boolean
  annonces: number
  leads: number
  conclus: number
  conversion: number | null // % des leads de la période aujourd'hui conclus
  note: number | null
  nbAvis: number
}

// Tableau « Performance de l'équipe » du dashboard Agence
// (KEYLI_DASHBOARD_DESIGN_SPEC.md §3.1) : agent, annonces, barre de
// conversion (animée comme TrendBar), note des biens attribués.
// Défile horizontalement sur petit écran.
export function PerformanceEquipe({
  lignes,
  onActiver,
  vide = 'Aucun agent pour l’instant.',
}: {
  lignes: LigneEquipe[]
  onActiver?: (id: string, actif: boolean) => void
  vide?: string
}) {
  if (lignes.length === 0) return <p className="text-sm text-muted-foreground">{vide}</p>
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Agent
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Annonces
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Leads
            </th>
            <th scope="col" className="w-40 px-3 py-2 font-semibold">
              Conversion
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Note
            </th>
            {onActiver && (
              <th scope="col" className="py-2 pl-3">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {lignes.map((l, rang) => (
            <tr key={l.id} className={cn(!l.actif && 'text-muted-foreground')}>
              <th scope="row" className="py-3 pr-3 text-left font-medium">
                {l.nom}
                {!l.actif && <span className="ml-2 text-xs font-normal">(inactif)</span>}
              </th>
              <td className="px-3 py-3 text-right tabular-nums">{l.annonces}</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {l.leads}
                {l.conclus > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {' '}
                    · {l.conclus} conclu{l.conclus > 1 ? 's' : ''}
                  </span>
                )}
              </td>
              <td className="px-3 py-3">
                {l.conversion === null ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 flex-1 overflow-hidden rounded-pill bg-secondary"
                      role="img"
                      aria-label={`Conversion ${l.conversion} %`}
                    >
                      <div
                        className="kf-barre h-full rounded-pill bg-success"
                        style={
                          { width: `${Math.min(100, l.conversion)}%`, '--kf-delai': `${rang * 80}ms` } as CSSProperties
                        }
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums">{l.conversion} %</span>
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {l.note === null ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <span className="inline-flex items-center gap-1" title={`${l.nbAvis} avis`}>
                    <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
                    {l.note.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                )}
              </td>
              {onActiver && (
                <td className="py-3 pl-3 text-right">
                  <button
                    type="button"
                    onClick={() => onActiver(l.id, !l.actif)}
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    {l.actif ? 'Désactiver' : 'Réactiver'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
