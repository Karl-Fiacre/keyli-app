import { useState } from 'react'
import { Users } from 'lucide-react'
import { CalendrierSejour } from '@/components/reservation/CalendrierSejour'
import { formatJourCourt, nuitsEntre, pluriel } from '@/partage/lib/sejour'

// Bloc « dates + voyageurs » des filtres de recherche (séjours courts)
export function DatesSejour({
  arrivee,
  depart,
  voyageurs,
  onChange,
}: {
  arrivee?: string
  depart?: string
  voyageurs?: number
  onChange: (p: { arrivee?: string; depart?: string; voyageurs?: number }) => void
}) {
  const [ouvert, setOuvert] = useState(!arrivee)
  // Sélection en cours (l'arrivée seule ne relance pas la recherche)
  const [brouillon, setBrouillon] = useState<string | null>(arrivee ?? null)

  return (
    <fieldset className="space-y-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Dates du séjour</legend>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="w-full rounded-lg bg-secondary px-3 py-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {arrivee && depart
          ? `${formatJourCourt(arrivee)} → ${formatJourCourt(depart)} · ${pluriel(nuitsEntre(arrivee, depart), 'nuit')}`
          : 'Choisir les dates'}
      </button>
      {ouvert && (
        <CalendrierSejour
          deuxMois={false}
          arrivee={depart ? (arrivee ?? null) : brouillon}
          depart={depart ?? null}
          onChange={(a, d) => {
            if (a && d) {
              onChange({ arrivee: a, depart: d })
              setOuvert(false)
            } else {
              setBrouillon(a)
              if (depart || !a) onChange({ arrivee: undefined, depart: undefined })
            }
          }}
        />
      )}
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          Voyageurs
        </span>
        <select
          className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
          value={voyageurs ?? ''}
          onChange={(e) => onChange({ voyageurs: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Indifférent</option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
              {n === 10 ? ' et plus' : ''}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  )
}
