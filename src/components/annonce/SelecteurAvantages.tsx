import type { Avantage } from '@/hooks/useAnnonces'
import { cn } from '@/lib/utils'

const CATEGORIES: Array<{ code: Avantage['categorie']; titre: string }> = [
  { code: 'equipement', titre: 'Équipements' },
  { code: 'proximite', titre: 'À proximité' },
]

// Avantages et proximités (liste fermée avantages_keyli), cases à basculer
export function SelecteurAvantages({
  avantages,
  selection,
  onChange,
}: {
  avantages: Avantage[]
  selection: string[]
  onChange: (ids: string[]) => void
}) {
  const basculer = (id: string) =>
    onChange(selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id])

  return (
    <div className="space-y-4">
      {CATEGORIES.map((c) => (
        <fieldset key={c.code}>
          <legend className="mb-2 text-sm font-medium">{c.titre}</legend>
          <div className="flex flex-wrap gap-2">
            {avantages
              .filter((a) => a.categorie === c.code)
              .map((a) => {
                const actif = selection.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => basculer(a.id)}
                    className={cn(
                      'rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors duration-150',
                      actif ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary',
                    )}
                  >
                    {a.libelle}
                  </button>
                )
              })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
