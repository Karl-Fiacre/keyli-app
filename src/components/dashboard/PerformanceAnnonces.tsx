import { Link } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { usePerformanceAnnonces } from '@/partage/hooks/useConversion'
import { formatTaux, qualiteAnnonce, tauxConversion } from '@/partage/lib/qualite'
import { cn } from '@/lib/utils'

// Performance et qualité de chaque annonce (Sprint 8, docs/MODULES/conversion.md) :
// visiteurs, contacts, taux de conversion et score de qualité avec le
// premier conseil à suivre. Propriétaires et agences.
export function PerformanceAnnonces({ jours = 30 }: { jours?: number }) {
  const perf = usePerformanceAnnonces(jours)

  return (
    <section className="rounded-lg border bg-card p-5" aria-labelledby="titre-performance">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 id="titre-performance" className="font-semibold">
          Performance de mes annonces
        </h2>
        <Link to="/annonces" className="text-sm text-muted-foreground hover:underline">
          Modifier mes annonces
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {jours} derniers jours. Taux = contacts ÷ visiteurs. Une annonce complète inspire davantage confiance.
      </p>

      {perf.isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {perf.isError && <p className="text-sm text-destructive-texte">Impossible de charger vos statistiques.</p>}
      {perf.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune annonce en ligne pour l'instant.</p>
      )}

      {!!perf.data?.length && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Annonce</th>
                <th className="px-3 py-2 text-right font-medium">Visiteurs</th>
                <th className="px-3 py-2 text-right font-medium">Contacts</th>
                <th className="px-3 py-2 text-right font-medium">Taux</th>
                <th className="py-2 pl-3 font-medium">Qualité</th>
              </tr>
            </thead>
            <tbody>
              {perf.data.map((a) => {
                const { score, conseils } = qualiteAnnonce(a)
                const visiteurs = Number(a.visiteurs)
                const contacts = Number(a.contacts)
                return (
                  <tr key={a.id} className="border-b align-top last:border-0">
                    <td className="max-w-[14rem] py-3 pr-3">
                      <Link to={`/annonce/${a.id}`} className="line-clamp-2 font-medium hover:underline">
                        {a.titre}
                      </Link>
                      {Number(a.intentions) > contacts && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {Number(a.intentions)} clic{Number(a.intentions) > 1 ? 's' : ''} sur « Contacter »
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{visiteurs}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{contacts}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      {formatTaux(tauxConversion(contacts, visiteurs))}
                    </td>
                    <td className="py-3 pl-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary"
                          role="meter"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={score}
                          aria-label="Qualité de l'annonce"
                        >
                          <span
                            className={cn(
                              'block h-full rounded-full',
                              score === 100 ? 'bg-success' : 'bg-primary-glow',
                            )}
                            style={{ width: `${score}%` }}
                          />
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">{score} %</span>
                      </div>
                      {conseils[0] && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-primary-glow" aria-hidden />
                          <span>
                            {conseils[0]}
                            {conseils.length > 1 && ` (+${conseils.length - 1})`}
                          </span>
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
