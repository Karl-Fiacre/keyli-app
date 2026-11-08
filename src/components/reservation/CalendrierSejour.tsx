import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { aujourdhuiIso, isoJour, jourDepuisIso } from '@/partage/lib/sejour'
import { cn } from '@/lib/utils'

const JOURS = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di']

interface Props {
  arrivee: string | null
  depart: string | null
  onChange: (arrivee: string | null, depart: string | null) => void
  // Nuits complètes (plus rien de libre) : non sélectionnables
  completes?: Set<string>
  // Mois affiché en premier (AAAA-MM-01), remonté au parent pour charger
  // les nuits complètes de la bonne fenêtre
  onMoisChange?: (premierMois: string) => void
  deuxMois?: boolean
}

// Calendrier de séjour : 1er clic = arrivée, 2e clic = départ. Les jours
// passés et les nuits complètes sont grisés ; un séjour ne peut pas
// enjamber une nuit complète. Navigation au clavier par les boutons natifs.
export function CalendrierSejour({ arrivee, depart, onChange, completes, onMoisChange, deuxMois = true }: Props) {
  const aujourdhui = aujourdhuiIso()
  const [mois, setMois] = useState(() => {
    const base = jourDepuisIso(arrivee ?? aujourdhui)
    return isoJour(new Date(base.getFullYear(), base.getMonth(), 1))
  })
  const [survol, setSurvol] = useState<string | null>(null)

  const changerMois = (n: number) => {
    const d = jourDepuisIso(mois)
    const suivant = isoJour(new Date(d.getFullYear(), d.getMonth() + n, 1))
    setMois(suivant)
    onMoisChange?.(suivant)
  }
  const premierMoisPossible = mois <= isoJour(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  // Première nuit complète après l'arrivée : le départ ne peut pas la dépasser
  const limiteDepart = useMemo(() => {
    if (!arrivee || depart || !completes) return null
    const triees = [...completes].filter((j) => j >= arrivee).sort()
    return triees[0] ?? null
  }, [arrivee, depart, completes])

  const choisir = (jour: string) => {
    if (!arrivee || depart || jour <= arrivee) {
      onChange(jour, null)
    } else {
      onChange(arrivee, jour)
    }
  }

  const moisAffiches = deuxMois ? [mois, ajouterMois(mois, 1)] : [mois]
  const finSurvol = depart ?? (arrivee && survol && survol > arrivee ? survol : null)

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Mois précédent"
          disabled={premierMoisPossible}
          onClick={() => changerMois(-1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {!arrivee ? 'Choisissez la date d’arrivée' : !depart ? 'Choisissez la date de départ' : 'Dates choisies'}
        </p>
        <Button type="button" variant="ghost" size="sm" aria-label="Mois suivant" onClick={() => changerMois(1)}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className={cn('grid gap-6', deuxMois && 'sm:grid-cols-2')}>
        {moisAffiches.map((m, i) => (
          <GrilleMois
            key={m}
            mois={m}
            masquerSurMobile={i > 0}
            rendreJour={(jour) => {
              const passe = jour < aujourdhui
              // Arrivée : la nuit du jour doit être libre. Départ : seule la
              // nuit précédente compte (on peut partir le matin d'une nuit complète)
              const choixDepart = !!arrivee && !depart && jour > arrivee
              const bloque = passe || (choixDepart ? !!limiteDepart && jour > limiteDepart : !!completes?.has(jour))
              const debut = jour === arrivee
              const fin = jour === finSurvol
              const dedans = !!arrivee && !!finSurvol && jour > arrivee && jour < finSurvol
              return (
                <button
                  type="button"
                  disabled={bloque}
                  onClick={() => choisir(jour)}
                  onMouseEnter={() => setSurvol(jour)}
                  onFocus={() => setSurvol(jour)}
                  aria-pressed={debut || fin}
                  aria-label={`${jourDepuisIso(jour).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}${completes?.has(jour) ? ', complet' : ''}`}
                  className={cn(
                    'relative flex h-10 w-full items-center justify-center text-sm transition-colors duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    bloque && 'cursor-not-allowed text-muted-foreground/50',
                    !bloque && !debut && !fin && 'rounded-lg hover:bg-secondary',
                    completes?.has(jour) && !passe && 'line-through',
                    dedans && 'bg-turquoise/15',
                    (debut || fin) && 'bg-primary font-semibold text-primary-foreground',
                    debut && (finSurvol ? 'rounded-l-lg' : 'rounded-lg'),
                    fin && 'rounded-r-lg',
                    jour === aujourdhui && !debut && !fin && 'font-bold text-primary-glow',
                  )}
                >
                  {jourDepuisIso(jour).getDate()}
                </button>
              )
            }}
          />
        ))}
      </div>
      {(arrivee || depart) && (
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null, null)}>
            Effacer les dates
          </Button>
        </div>
      )}
    </div>
  )
}

function ajouterMois(mois: string, n: number) {
  const d = jourDepuisIso(mois)
  return isoJour(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

function GrilleMois({
  mois,
  rendreJour,
  masquerSurMobile,
}: {
  mois: string
  rendreJour: (jour: string) => React.ReactNode
  masquerSurMobile: boolean
}) {
  const d = jourDepuisIso(mois)
  const nbJours = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  // Lundi en premier (0 = lundi)
  const decalage = (d.getDay() + 6) % 7
  const titre = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return (
    <div className={cn(masquerSurMobile && 'hidden sm:block')}>
      <p className="mb-2 text-center text-sm font-semibold capitalize">{titre}</p>
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground" aria-hidden>
        {JOURS.map((j) => (
          <span key={j} className="py-1">
            {j}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1" role="group" aria-label={titre}>
        {Array.from({ length: decalage }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: nbJours }, (_, i) => {
          const jour = isoJour(new Date(d.getFullYear(), d.getMonth(), i + 1))
          return <div key={jour}>{rendreJour(jour)}</div>
        })}
      </div>
    </div>
  )
}
