import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BedDouble, Home, MapPin, Navigation } from 'lucide-react'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { BoutonFavori } from '@/components/annonce/BoutonFavori'
import type { ResumeAnnonce } from '@/partage/lib/annonce'
import { formatXof } from '@/partage/lib/format'
import { libelleDistance } from '@/partage/lib/recherche'
import { LIBELLES_TYPE } from '@/partage/lib/validation'
import { urlPhoto } from '@/lib/cloudinary'
import { ImageFondu } from '@/components/animation/ImageFondu'
import { CarteInclinee } from '@/components/animation/CarteInclinee'
import { usePrechargerFiche } from '@/partage/hooks/useRecherche'
import { useNavigationPartagee } from '@/hooks/useNavigationPartagee'
import { chargerFicheAnnonce } from '@/lib/pagesPrechargees'
import { estRetourAnnonce, nomTransitionPhoto, type EtatTransitionPartagee } from '@/lib/cinema'

export type { ResumeAnnonce }

// Carte d'un résultat de recherche : photo (ou visuel neutre en attendant
// les photos), prix, lieu, badge « Vérifié » si l'annonce l'est. Le cœur
// favori est posé à côté du lien (un bouton ne va pas dans un lien).
// La carte s'incline sous la souris (registre cinématique, docs/ANIMATIONS.md).
// Au clic, sa photo s'agrandit jusqu'à la galerie de la fiche (transition
// partagée) ; la fiche est préchargée dès le survol ou le focus.
export function CarteAnnonce({
  annonce: a,
  source = 'search',
  sejour,
}: {
  annonce: ResumeAnnonce
  source?: string
  // Dates de la recherche (« arrivee=…&depart=…&voyageurs=… »), reprises sur la fiche
  sejour?: string
}) {
  const hotelier = a.type === 'hotel' || a.type === 'auberge'
  const lieu = [a.quartier, a.commune && a.commune !== a.quartier ? a.commune : null, a.ville]
    .filter(Boolean)
    .join(', ')
  // Recherche par rayon : distance arrondie, jamais la position exacte
  const distance = libelleDistance(a.distance_km)
  const prechargerDonnees = usePrechargerFiche()
  // Données de la fiche et code de la page, pour qu'elle s'affiche aussitôt
  const precharger = (id: string) => {
    prechargerDonnees(id)
    void chargerFicheAnnonce()
  }
  const naviguer = useNavigationPartagee()
  const lien = `/annonce/${a.id}?source=${source}${a.sejour_court && sejour ? `&${sejour}` : ''}`
  const etat: EtatTransitionPartagee = { transitionPartagee: true, apercu: a.image }
  const photo = useRef<HTMLDivElement>(null)
  // Le nom de transition n'est posé que sur la carte concernée (une même
  // annonce peut figurer deux fois sur une page, et deux éléments du même
  // nom annuleraient la transition) : au clic pour l'aller, ou au retour
  // depuis la fiche de cette annonce.
  const { state } = useLocation()
  const retourIci = estRetourAnnonce(state) && state.retourAnnonce === a.id
  return (
    <CarteInclinee intensite={5} arrondi="rounded-lg" className="h-full">
      <div className="relative">
        <Link
          to={lien}
          state={etat}
          onPointerEnter={() => precharger(a.id)}
          onFocus={() => precharger(a.id)}
          onTouchStart={() => precharger(a.id)}
          onClick={(e) =>
            naviguer(e, lien, etat, () => {
              if (photo.current) photo.current.style.viewTransitionName = nomTransitionPhoto(a.id)
            })
          }
          className="group block overflow-hidden rounded-lg border bg-card shadow-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
        >
          <div
            className="relative aspect-[4/3] overflow-hidden bg-secondary"
            ref={photo}
            style={retourIci ? { viewTransitionName: nomTransitionPhoto(a.id) } : undefined}
          >
            {a.image ? (
              <ImageFondu
                src={urlPhoto(a.image, 640, 480)}
                alt=""
                loading="lazy"
                className="kf-zoom h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Home className="h-10 w-10" aria-hidden />
              </div>
            )}
            <span className="absolute left-3 top-3 rounded-pill bg-background/90 px-3 py-1 text-xs font-semibold">
              {a.sejour_court ? 'Séjour court' : a.statut === 'a_louer' ? 'À louer' : 'À vendre'}
            </span>
          </div>
          <div className="space-y-1.5 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-lg font-bold">
                {a.sejour_court && hotelier && <span className="text-sm font-normal text-muted-foreground">dès </span>}
                {formatXof(Number(a.prix))}
                {a.statut === 'a_louer' && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {a.sejour_court ? ' / nuit' : ' / mois'}
                  </span>
                )}
              </p>
              {a.verifiee && <VerifiedBadge className="shrink-0 text-xs" />}
            </div>
            <p className="line-clamp-1 font-medium group-hover:underline">{a.titre}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-1">{lieu}</span>
            </p>
            {distance && (
              <p className="flex items-center gap-1 text-sm font-semibold text-turquoise">
                <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {distance}
              </p>
            )}
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
        <BoutonFavori propertyId={a.id} className="absolute right-3 top-3" />
      </div>
    </CarteInclinee>
  )
}
