import { useRef } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PhotoGrille {
  cle: string
  src: string
}

// Grille de photos d'une annonce : ajout (plusieurs à la fois), retrait,
// déplacement ; la première photo est la photo principale. Partagée par la
// publication et la gestion depuis « Mes annonces ».
export function GrillePhotos({
  photos,
  max,
  min = 0,
  occupe = false,
  progression,
  erreur,
  onAjouter,
  onRetirer,
  onDeplacer,
}: {
  photos: PhotoGrille[]
  max: number
  // Nombre minimal à conserver : le retrait est désactivé à ce seuil
  min?: number
  occupe?: boolean
  // Avancement de l'envoi en cours, de 0 à 1
  progression?: number | null
  erreur?: string
  onAjouter: (fichiers: File[]) => void
  onRetirer: (cle: string) => void
  onDeplacer: (cle: string, sens: -1 | 1) => void
}) {
  const champ = useRef<HTMLInputElement>(null)
  const restantes = max - photos.length

  const choisir = (liste: FileList | null) => {
    if (!liste) return
    onAjouter(Array.from(liste).slice(0, Math.max(0, restantes)))
    if (champ.current) champ.current.value = ''
  }

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Photos de l'annonce">
        {photos.map((p, i) => (
          <li key={p.cle} className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-secondary">
            <img src={p.src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
            {i === 0 && (
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-pill bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                <Star className="h-3 w-3" aria-hidden />
                Principale
              </span>
            )}
            <button
              type="button"
              onClick={() => onRetirer(p.cle)}
              disabled={occupe || photos.length <= min}
              title={photos.length <= min ? 'Une annonce garde au moins une photo' : 'Retirer cette photo'}
              aria-label={`Retirer la photo ${i + 1}`}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow-sm transition-colors hover:bg-card disabled:opacity-40"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div className="absolute inset-x-2 bottom-2 flex justify-between">
              <button
                type="button"
                onClick={() => onDeplacer(p.cle, -1)}
                disabled={occupe || i === 0}
                aria-label={`Avancer la photo ${i + 1}`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow-sm disabled:invisible"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onDeplacer(p.cle, 1)}
                disabled={occupe || i === photos.length - 1}
                aria-label={`Reculer la photo ${i + 1}`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-card/90 shadow-sm disabled:invisible"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
        {restantes > 0 && (
          <li>
            <button
              type="button"
              onClick={() => champ.current?.click()}
              disabled={occupe}
              className={cn(
                'flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-primary-glow hover:text-foreground disabled:opacity-60',
                erreur && 'border-destructive',
              )}
            >
              <ImagePlus className="h-6 w-6" aria-hidden />
              <span className="font-medium">Ajouter des photos</span>
              <span className="text-xs">
                {photos.length}/{max}
              </span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={champ}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => choisir(e.target.files)}
      />
      {progression !== null && progression !== undefined && (
        <div className="space-y-1" role="status">
          <div className="h-2 overflow-hidden rounded-pill bg-secondary">
            <div
              className="h-full rounded-pill bg-turquoise transition-[width] duration-200"
              style={{ width: `${Math.round(progression * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Envoi des photos… {Math.round(progression * 100)} %</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        La première photo est la photo principale. Utilisez les flèches pour changer l'ordre. Façade, pièces de vie,
        cuisine, salle de bain : des photos nettes et lumineuses inspirent confiance.
      </p>
      {erreur && <p className="text-xs font-medium text-destructive-texte">{erreur}</p>}
    </div>
  )
}
