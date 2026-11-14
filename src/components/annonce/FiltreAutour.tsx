import { useState } from 'react'
import { LocateFixed, X } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import type { FiltresRecherche } from '@/partage/hooks/useRecherche'
import { RAYONS_KM, RAYON_DEFAUT_KM } from '@/partage/lib/recherche'
import { cn } from '@/lib/utils'

// Recherche par rayon autour de la position de l'utilisateur (décisions du
// porteur du 2026-11-14, identiques au mobile) : rayons 1, 3, 5, 10 km, 5 par
// défaut ; le rayon remplace commune et quartier. La position vient du
// navigateur, reste en mémoire dans la page (jamais dans l'URL ni enregistrée)
// et la base ne renvoie qu'une distance arrondie.
export function FiltreAutour({
  filtres,
  onChange,
}: {
  filtres: FiltresRecherche
  onChange: (f: FiltresRecherche) => void
}) {
  const [recherche, setRecherche] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const autour = filtres.autour

  const activer = () => {
    setErreur(null)
    if (!('geolocation' in navigator)) {
      setErreur('Votre navigateur ne permet pas de connaître votre position.')
      return
    }
    setRecherche(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setRecherche(false)
        onChange({
          ...filtres,
          autour: { lat: p.coords.latitude, lng: p.coords.longitude, rayonKm: RAYON_DEFAUT_KM },
          page: 1,
        })
      },
      (e) => {
        setRecherche(false)
        setErreur(
          e.code === e.PERMISSION_DENIED
            ? "Keyli n'a pas accès à votre position. Autorisez la localisation dans votre navigateur pour chercher autour de vous."
            : "Votre position n'a pas pu être déterminée. Réessayez dans un instant.",
        )
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Rechercher autour de moi">
        <button
          type="button"
          onClick={() => (autour ? onChange({ ...filtres, autour: undefined, page: 1 }) : activer())}
          disabled={recherche}
          aria-pressed={!!autour}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-pill border-2 border-turquoise px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
            autour ? 'bg-turquoise text-white' : 'bg-background hover:bg-turquoise/10',
          )}
        >
          <LocateFixed className={cn('h-4 w-4', !autour && 'text-turquoise', recherche && 'animate-pulse')} aria-hidden />
          {recherche ? 'Localisation…' : 'Autour de moi'}
          {autour && <X className="h-4 w-4" aria-label="Désactiver" />}
        </button>
        {autour &&
          RAYONS_KM.map((km) => (
            <button
              key={km}
              type="button"
              aria-pressed={autour.rayonKm === km}
              aria-label={`Rayon de ${km} kilomètres`}
              onClick={() => onChange({ ...filtres, autour: { ...autour, rayonKm: km }, page: 1 })}
              className={cn(
                'h-10 rounded-pill border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                autour.rayonKm === km ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary',
              )}
            >
              {km} km
            </button>
          ))}
      </div>
      {autour && (filtres.commune || filtres.quartier) && (
        <p className="text-sm text-muted-foreground">Le rayon remplace la commune et le quartier choisis.</p>
      )}
      {erreur && <Alert variant="erreur">{erreur}</Alert>}
    </div>
  )
}
