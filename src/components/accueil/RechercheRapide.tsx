import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCommunes } from '@/hooks/useRecherche'
import type { StatutBien, TypeBien } from '@/hooks/useAnnonces'
import { ecrireFiltres } from '@/lib/recherche'
import { LIBELLES_TYPE, TYPES_BIEN } from '@/lib/validation'
import { cn } from '@/lib/utils'

const CHAMP =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Barre de recherche de la bannière : louer/acheter, commune, type, budget.
// Elle ne fait que préparer l'adresse de /recherche : la base filtre.
export function RechercheRapide() {
  const naviguer = useNavigate()
  const communes = useCommunes().data ?? []
  const [statut, setStatut] = useState<StatutBien>('a_louer')
  const [commune, setCommune] = useState('')
  const [type, setType] = useState('')
  const [budget, setBudget] = useState('')

  const rechercher = (e: FormEvent) => {
    e.preventDefault()
    const max = Number(budget)
    const p = ecrireFiltres({
      statut,
      commune: commune || undefined,
      type: (type || undefined) as TypeBien | undefined,
      prixMax: budget && Number.isFinite(max) && max > 0 ? max : undefined,
      avantages: [],
      tri: 'pertinence',
      page: 1,
    })
    naviguer(`/recherche?${p.toString()}`)
  }

  return (
    <form
      onSubmit={rechercher}
      role="search"
      aria-label="Rechercher un logement"
      className="rounded-accueil bg-background p-3 text-foreground shadow-lift sm:p-4"
    >
      <div className="mb-3 inline-flex rounded-pill bg-secondary p-1" role="radiogroup" aria-label="Je souhaite">
        {(
          [
            ['a_louer', 'Louer'],
            ['a_vendre', 'Acheter'],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={statut === v}
            onClick={() => setStatut(v)}
            className={cn(
              'rounded-pill px-5 py-1.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              statut === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
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
            placeholder={statut === 'a_louer' ? 'Loyer max (FCFA)' : 'Budget max (FCFA)'}
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <Button type="submit" variant="turquoise" size="lg" className="h-11 sm:col-span-3">
          <Search className="mr-2 h-4 w-4" aria-hidden />
          Rechercher
        </Button>
      </div>
    </form>
  )
}
