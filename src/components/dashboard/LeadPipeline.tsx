import { LeadCard, type Lead } from '@/components/dashboard/LeadCard'
import { ETAPES_LEAD, type EtapeLead } from '@/lib/dashboard'
import { cn } from '@/lib/utils'

// Pipeline en colonnes Nouveau → Visite planifiée → Négociation → Conclu
// (KEYLI_DASHBOARD_DESIGN_SPEC.md §2-3, dashboard Agence). Chaque carte
// change d'étape par son menu (décision du 2026-10-30) ; l'enregistrement
// est confié à l'appelant (règles en base : leads_keyli, owner seulement).
// Sur petit écran, les colonnes défilent horizontalement.
export function LeadPipeline({
  leads,
  onChangerEtape,
  leadEnCours,
  maxParColonne = 6,
}: {
  leads: Lead[]
  onChangerEtape?: (leadId: string, etape: EtapeLead) => void
  leadEnCours?: string | null
  maxParColonne?: number
}) {
  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
      {ETAPES_LEAD.map((col) => {
        const cartes = leads.filter((l) => l.etape === col.code)
        return (
          <section
            key={col.code}
            className="w-64 shrink-0 snap-start space-y-2 rounded-lg bg-secondary/60 p-2 lg:w-auto"
            aria-label={col.libelle}
          >
            <header className="flex items-center justify-between px-1 pt-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {col.libelle}
              </h3>
              <span
                className={cn(
                  'rounded-pill px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                  col.code === 'conclu' ? 'bg-success/15 text-success' : 'bg-background text-foreground',
                )}
              >
                {cartes.length}
              </span>
            </header>
            {cartes.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">Aucun lead</p>
            ) : (
              <>
                {cartes.slice(0, maxParColonne).map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    enCours={leadEnCours === l.id}
                    onChangerEtape={onChangerEtape ? (e) => onChangerEtape(l.id, e) : undefined}
                  />
                ))}
                {cartes.length > maxParColonne && (
                  <p className="px-1 text-center text-xs text-muted-foreground">
                    + {cartes.length - maxParColonne} autres
                  </p>
                )}
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}
