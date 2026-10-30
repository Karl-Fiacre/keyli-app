import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type EtatEtape = 'fait' | 'en_cours' | 'a_faire'

export interface Etape {
  libelle: string
  etat: EtatEtape
}

const LIBELLES_ETAT: Record<EtatEtape, string> = { fait: 'terminée', en_cours: 'en cours', a_faire: 'à faire' }

// Étapes horizontales (KEYLI_DASHBOARD_DESIGN_SPEC.md §2-3, dashboard
// Propriétaire : Identité → Document → Validation → Vérifié). Une étape faite
// remplit son cercle (vert --success), puis le trait suivant se dessine de
// gauche à droite, l'un après l'autre (spec 5.3) ; en cours = --pending.
export function VerificationStepper({ etapes, note }: { etapes: Etape[]; note?: ReactNode }) {
  return (
    <div className="space-y-3">
      <ol className="flex items-start" aria-label="Étapes de vérification">
        {etapes.map((e, i) => {
          return (
            <Fragment key={e.libelle}>
              <li className="flex w-16 shrink-0 flex-col items-center gap-2 text-center sm:w-24">
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-pill border-2 text-sm font-bold',
                    e.etat === 'fait' && 'kf-pastille-apparait border-success bg-success text-primary-foreground',
                    e.etat === 'en_cours' && 'border-pending bg-pending/15 text-pending',
                    e.etat === 'a_faire' && 'border-border bg-background text-muted-foreground',
                  )}
                  style={e.etat === 'fait' ? { animationDelay: `${i * 300}ms` } : undefined}
                  aria-hidden
                >
                  {e.etat === 'fait' ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    'text-[11px] leading-tight sm:text-xs',
                    e.etat === 'a_faire' ? 'text-muted-foreground' : 'font-medium',
                  )}
                >
                  {e.libelle}
                  <span className="sr-only"> : étape {LIBELLES_ETAT[e.etat]}</span>
                </span>
              </li>
              {i < etapes.length - 1 && (
                <li aria-hidden className="mt-[17px] h-0.5 min-w-2 flex-1 overflow-hidden rounded-pill bg-border">
                  {e.etat === 'fait' && (
                    <span
                      className="kf-barre block h-full bg-success"
                      style={{ '--kf-delai': `${i * 300 + 150}ms` } as CSSProperties}
                    />
                  )}
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  )
}
