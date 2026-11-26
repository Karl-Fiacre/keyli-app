import { urlPhoto } from '@/lib/cloudinary'

// Fiche d'annonce en cours de chargement : la mise en page de la fiche en
// squelettes animés (kf-squelette, docs/ANIMATIONS.md). Si l'on arrive
// depuis une carte, sa photo (déjà en cache) occupe la place de la galerie
// et sert de destination à la transition partagée.
export function SqueletteFiche({ nomTransition, apercu }: { nomTransition?: string; apercu?: string | null }) {
  return (
    <section className="container py-8 md:py-12" aria-busy="true" aria-label="Chargement de l'annonce">
      <div className="kf-squelette mb-5 h-4 w-40 rounded" />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <div
            className={apercu ? 'relative aspect-[16/9] overflow-hidden rounded-lg bg-secondary' : 'kf-squelette aspect-[16/9] rounded-lg'}
            style={nomTransition ? { viewTransitionName: nomTransition } : undefined}
          >
            {apercu && (
              <img src={urlPhoto(apercu, 640, 480)} alt="" aria-hidden className="h-full w-full object-cover" />
            )}
          </div>
          <div className="space-y-3">
            <div className="kf-squelette h-6 w-24 rounded-pill" />
            <div className="kf-squelette h-8 w-3/4 rounded" />
            <div className="kf-squelette h-4 w-1/2 rounded" />
          </div>
          <div className="space-y-2">
            <div className="kf-squelette h-4 w-full rounded" />
            <div className="kf-squelette h-4 w-full rounded" />
            <div className="kf-squelette h-4 w-2/3 rounded" />
          </div>
        </div>
        <div className="kf-squelette h-72 rounded-lg" />
      </div>
    </section>
  )
}
