import { Link } from 'react-router-dom'
import { Home, MapPin } from 'lucide-react'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { formatXof } from '@/lib/format'

export interface Recommandation {
  id: string
  titre: string
  prix: number
  aLouer: boolean
  lieu: string
  image?: string | null
  verifiee: boolean
  // Score 0-100. Son calcul n'est pas encore défini (MODULES/dashboard.md ⚠️) :
  // le composant l'affiche seulement s'il est fourni.
  pertinence?: number | null
}

// Carte « Pour vous » du dashboard Chercheur (KEYLI_DASHBOARD_DESIGN_SPEC.md §2) :
// chip de confiance (badge Vérifié, asset distinct du logo) et score de
// pertinence. Survol : scale(1.02) + ombre, 150 ms (spec 5.3).
export function RecommendationCard({ reco: r }: { reco: Recommandation }) {
  return (
    <Link
      to={`/annonce/${r.id}?source=recommendation`}
      className="group block w-64 shrink-0 snap-start overflow-hidden rounded-lg border bg-card shadow-sm transition-[transform,box-shadow] duration-150 hover:scale-[1.02] hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:scale-100"
    >
      <div className="relative aspect-[16/10] bg-secondary">
        {r.image ? (
          <img src={r.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Home className="h-8 w-8" aria-hidden />
          </div>
        )}
        {r.pertinence != null && (
          <span className="absolute right-2 top-2 rounded-pill bg-background/90 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
            {Math.round(r.pertinence)} % pour vous
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold">
            {formatXof(r.prix)}
            {r.aLouer && <span className="text-xs font-normal text-muted-foreground"> / mois</span>}
          </p>
          {r.verifiee && <VerifiedBadge className="shrink-0 text-[11px]" />}
        </div>
        <p className="line-clamp-1 text-sm font-medium group-hover:underline">{r.titre}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          <span className="line-clamp-1">{r.lieu}</span>
        </p>
      </div>
    </Link>
  )
}

// Carrousel horizontal : scroll-snap natif, aucune animation JS (spec 5.3).
export function CarrouselRecommandations({
  recos,
  vide = "Aucune recommandation pour l'instant.",
}: {
  recos: Recommandation[]
  vide?: string
}) {
  if (recos.length === 0) return <p className="text-sm text-muted-foreground">{vide}</p>
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-2" role="list">
      {recos.map((r) => (
        <div key={r.id} role="listitem">
          <RecommendationCard reco={r} />
        </div>
      ))}
    </div>
  )
}
