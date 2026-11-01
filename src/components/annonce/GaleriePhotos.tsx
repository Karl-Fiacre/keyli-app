import { useState } from 'react'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { urlPhoto } from '@/lib/cloudinary'
import { cn } from '@/lib/utils'

// Galerie de la fiche d'annonce : grande photo, flèches et vignettes.
// Images servies par Cloudinary au format et à la taille de l'écran.
export function GaleriePhotos({ photos, titre }: { photos: { id: string; url: string }[]; titre: string }) {
  const [courante, setCourante] = useState(0)
  const n = photos.length

  if (n === 0) {
    return (
      <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-lg bg-secondary text-muted-foreground">
        <Home className="h-12 w-12" aria-hidden />
        <span className="text-sm">Photos bientôt disponibles</span>
      </div>
    )
  }

  const i = Math.min(courante, n - 1)
  const aller = (sens: -1 | 1) => setCourante((i + sens + n) % n)

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-secondary">
        <img
          src={urlPhoto(photos[i].url, 1280, 720)}
          srcSet={`${urlPhoto(photos[i].url, 640, 360)} 640w, ${urlPhoto(photos[i].url, 1280, 720)} 1280w`}
          sizes="(min-width: 1024px) 50vw, 100vw"
          alt={`${titre} — photo ${i + 1} sur ${n}`}
          className="h-full w-full object-cover"
        />
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={() => aller(-1)}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 shadow-sm transition-colors hover:bg-card"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => aller(1)}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 shadow-sm transition-colors hover:bg-card"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <span className="absolute bottom-3 right-3 rounded-pill bg-primary/80 px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              {i + 1} / {n}
            </span>
          </>
        )}
      </div>
      {n > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, k) => (
            <li key={p.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setCourante(k)}
                aria-label={`Voir la photo ${k + 1}`}
                aria-current={k === i}
                className={cn(
                  'h-16 w-24 overflow-hidden rounded-md border-2 transition-opacity',
                  k === i ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <img src={urlPhoto(p.url, 192, 128)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
