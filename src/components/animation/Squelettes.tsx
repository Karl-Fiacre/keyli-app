import { cn } from '@/lib/utils'

// Squelettes de chargement (lot 4, docs/ANIMATIONS.md) : la forme de ce qui
// arrive, parcourue par une lueur (kf-squelette), à la place d'un simple
// « Chargement… ». Immobiles en mouvements réduits.

// Grille de cartes d'annonce : photo 4/3 puis prix, titre et lieu
export function SqueletteCartes({ nombre = 6, className }: { nombre?: number; className?: string }) {
  return (
    <ul className={cn('grid gap-5 sm:grid-cols-2 xl:grid-cols-3', className)} aria-busy="true" aria-label="Chargement des annonces">
      {Array.from({ length: nombre }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-lg border bg-card">
          <div className="kf-squelette aspect-[4/3]" />
          <div className="space-y-2 p-4">
            <div className="kf-squelette h-5 w-1/3 rounded" />
            <div className="kf-squelette h-4 w-3/4 rounded" />
            <div className="kf-squelette h-3 w-1/2 rounded" />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Lignes d'une liste (annonces, réservations, documents, pistes)
export function SqueletteLignes({ nombre = 3, className }: { nombre?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Chargement">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <div className="kf-squelette h-12 w-16 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="kf-squelette h-4 w-2/3 rounded" />
            <div className="kf-squelette h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
