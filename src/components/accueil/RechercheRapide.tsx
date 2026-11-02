import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CalendrierSejour } from '@/components/reservation/CalendrierSejour'
import { useCommunes } from '@/hooks/useRecherche'
import type { TypeBien } from '@/hooks/useAnnonces'
import { ecrireFiltres } from '@/lib/recherche'
import { formatJourCourt } from '@/lib/sejour'
import { LIBELLES_TYPE, TYPES_BIEN } from '@/lib/validation'
import { cn } from '@/lib/utils'

const CHAMP =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type Mode = 'sejour' | 'a_louer' | 'a_vendre'

// Barre de recherche de la bannière : séjour (dates, voyageurs), location
// ou achat (type, budget). Elle ne fait que préparer l'adresse de
// /recherche : la base filtre et vérifie la disponibilité.
export function RechercheRapide() {
  const naviguer = useNavigate()
  const communes = useCommunes().data ?? []
  const [mode, setMode] = useState<Mode>('sejour')
  const [commune, setCommune] = useState('')
  const [type, setType] = useState('')
  const [budget, setBudget] = useState('')
  const [arrivee, setArrivee] = useState<string | null>(null)
  const [depart, setDepart] = useState<string | null>(null)
  const [voyageurs, setVoyageurs] = useState('2')
  const [calendrier, setCalendrier] = useState(false)

  const rechercher = (e: FormEvent) => {
    e.preventDefault()
    const max = Number(budget)
    const sejour = mode === 'sejour'
    const p = ecrireFiltres({
      statut: sejour ? 'a_louer' : mode,
      sejour: sejour || undefined,
      arrivee: sejour && arrivee && depart ? arrivee : undefined,
      depart: sejour && arrivee && depart ? depart : undefined,
      voyageurs: sejour ? Number(voyageurs) || undefined : undefined,
      commune: commune || undefined,
      type: !sejour && type ? (type as TypeBien) : undefined,
      prixMax: !sejour && budget && Number.isFinite(max) && max > 0 ? max : undefined,
      avantages: [],
      tri: 'pertinence',
      page: 1,
    })
    naviguer(`/recherche?${p.toString()}`)
  }

  const champCommune = (
    <label className="block">
      <span className="sr-only">Commune</span>
      <select className={CHAMP} value={commune} onChange={(e) => setCommune(e.target.value)}>
        <option value="">Toutes les communes</option>
        {communes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nom}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <form
      onSubmit={rechercher}
      role="search"
      aria-label="Rechercher un logement"
      className="relative rounded-accueil bg-background p-3 text-foreground shadow-lift sm:p-4"
    >
      <div className="mb-3 inline-flex rounded-pill bg-secondary p-1" role="radiogroup" aria-label="Je souhaite">
        {(
          [
            ['sejour', 'Séjour'],
            ['a_louer', 'Louer'],
            ['a_vendre', 'Acheter'],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={mode === v}
            onClick={() => {
              setMode(v)
              setCalendrier(false)
            }}
            className={cn(
              'rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5',
              mode === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {mode === 'sejour' ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_0.8fr]">
          {champCommune}
          <button
            type="button"
            onClick={() => setCalendrier((o) => !o)}
            aria-expanded={calendrier}
            className={cn(CHAMP, 'flex items-center gap-2 text-left')}
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className={cn('truncate', !arrivee && 'text-muted-foreground')}>
              {arrivee && depart
                ? `${formatJourCourt(arrivee)} → ${formatJourCourt(depart)}`
                : arrivee
                  ? `${formatJourCourt(arrivee)} → départ ?`
                  : 'Arrivée → Départ'}
            </span>
          </button>
          <label className="block">
            <span className="sr-only">Voyageurs</span>
            <select className={CHAMP} value={voyageurs} onChange={(e) => setVoyageurs(e.target.value)}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} voyageur{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </label>
          {calendrier && (
            <div className="kf-panneau-ouvre rounded-lg border bg-background p-3 shadow-card sm:col-span-3">
              <CalendrierSejour
                arrivee={arrivee}
                depart={depart}
                onChange={(a, d) => {
                  setArrivee(a)
                  setDepart(d)
                  if (a && d) setCalendrier(false)
                }}
              />
            </div>
          )}
          <Button type="submit" variant="turquoise" size="lg" className="h-11 sm:col-span-3">
            <Search className="mr-2 h-4 w-4" aria-hidden />
            {arrivee && depart ? 'Voir les disponibilités' : 'Rechercher un séjour'}
          </Button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {champCommune}
          <label className="block">
            <span className="sr-only">Type de bien</span>
            <select className={CHAMP} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Tous les types</option>
              {TYPES_BIEN.map((t) => (
                <option key={t} value={t}>
                  {LIBELLES_TYPE[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Budget maximum en francs CFA</span>
            <input
              className={CHAMP}
              inputMode="numeric"
              placeholder={mode === 'a_louer' ? 'Loyer max (FCFA)' : 'Budget max (FCFA)'}
              value={budget}
              onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <Button type="submit" variant="turquoise" size="lg" className="h-11 sm:col-span-3">
            <Search className="mr-2 h-4 w-4" aria-hidden />
            Rechercher
          </Button>
        </div>
      )}
    </form>
  )
}
