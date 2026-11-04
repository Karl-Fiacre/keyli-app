import { LayoutGrid, Map as IconeCarte } from 'lucide-react'
import type { VueCatalogue } from '@/hooks/useVueCatalogue'
import { cn } from '@/lib/utils'

const VUES: Array<{ valeur: VueCatalogue; libelle: string; icone: typeof LayoutGrid }> = [
  { valeur: 'liste', libelle: 'Liste', icone: LayoutGrid },
  { valeur: 'carte', libelle: 'Carte', icone: IconeCarte },
]

// Bascule « Liste | Carte » du catalogue
export function BasculeVue({ vue, onChange }: { vue: VueCatalogue; onChange: (v: VueCatalogue) => void }) {
  return (
    <div role="group" aria-label="Affichage des annonces" className="inline-flex rounded-lg border bg-card p-1">
      {VUES.map(({ valeur, libelle, icone: Icone }) => (
        <button
          key={valeur}
          type="button"
          aria-pressed={vue === valeur}
          onClick={() => onChange(valeur)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors duration-150',
            vue === valeur ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary',
          )}
        >
          <Icone className="h-4 w-4" aria-hidden />
          {libelle}
        </button>
      ))}
    </div>
  )
}
