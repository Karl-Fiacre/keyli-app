import { Link } from 'react-router-dom'
import { BedDouble, Home, MapPin } from 'lucide-react'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import type { StatutBien, TypeBien } from '@/hooks/useAnnonces'
import { formatXof } from '@/lib/format'
import { LIBELLES_TYPE } from '@/lib/validation'

export interface ResumeAnnonce {
  id: string
  titre: string
  type: TypeBien
  statut: StatutBien
  prix: number
  ville: string
  quartier: string | null
  commune: string | null
  pieces: number | null
  image: string | null
  verifiee: boolean
}

// Carte d'un résultat de recherche : photo (ou visuel neutre en attendant
// les photos), prix, lieu, badge « Vérifié » si l'annonce l'est
export function CarteAnnonce({ annonce: a }: { annonce: ResumeAnnonce }) {
  const lieu = [a.quartier, a.commune && a.commune !== a.quartier ? a.commune : null, a.ville]
    .filter(Boolean)
    .join(', ')
  return (
    <Link
      to={`/annonce/${a.id}?source=search`}
      className="group block overflow-hidden rounded-lg border bg-card shadow-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[4/3] bg-secondary">
        {a.image ? (
          <img src={a.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Home className="h-10 w-10" aria-hidden />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-3 py-1 text-xs font-semibold">
          {a.statut === 'a_louer' ? 'À louer' : 'À vendre'}
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-lg font-bold">
            {formatXof(Number(a.prix))}
            {a.statut === 'a_louer' && <span className="text-sm font-normal text-muted-foreground"> / mois</span>}
          </p>
          {a.verifiee && <VerifiedBadge className="shrink-0 text-xs" />}
        </div>
        <p className="line-clamp-1 font-medium group-hover:underline">{a.titre}</p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="line-clamp-1">{lieu}</span>
        </p>
        <p className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{LIBELLES_TYPE[a.type]}</span>
          {a.pieces !== null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" aria-hidden />
              {a.pieces} pièce{a.pieces > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}
