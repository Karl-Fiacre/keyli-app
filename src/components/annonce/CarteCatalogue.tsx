import { useEffect, useRef, useState } from 'react'
import { Info, MapPinOff, X } from 'lucide-react'
import { CarteAnnonce, type ResumeAnnonce } from '@/components/annonce/CarteAnnonce'
import { useConfigCarte } from '@/hooks/useAnnonces'
import { usePositionsAnnonces } from '@/hooks/useRecherche'
import { chargerGoogleMaps } from '@/lib/googleMaps'
import { formatPrixCourt } from '@/lib/format'

const ABIDJAN = { lat: 5.36, lng: -4.0083 }

// Vue carte du catalogue : un repère de prix par annonce affichée, à sa
// position APPROXIMATIVE (calculée par la base, décision du porteur du
// 2026-11-04 — l'adresse exacte se donne par la messagerie). Un clic sur
// un repère ouvre la carte de l'annonce sous la carte.
export function CarteCatalogue({ annonces, sejour }: { annonces: ResumeAnnonce[]; sejour?: string }) {
  const config = useConfigCarte()
  const positions = usePositionsAnnonces(
    annonces.map((a) => a.id),
    true,
  )
  const conteneur = useRef<HTMLDivElement>(null)
  // Carte gardée dans l'état : les repères se posent dès qu'elle existe
  const [carte, setCarte] = useState<google.maps.Map | null>(null)
  const reperes = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const [indisponible, setIndisponible] = useState(false)
  const [choisie, setChoisie] = useState<string | null>(null)

  // Chargement de la carte (bibliothèque chargée seulement quand la vue est ouverte)
  useEffect(() => {
    const cfg = config.data
    if (!cfg || !conteneur.current || carte) return
    let annule = false
    chargerGoogleMaps(cfg.cle)
      .then(() => Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('marker')]))
      .then(([maps]) => {
        if (annule || !conteneur.current) return
        const { Map } = maps as google.maps.MapsLibrary
        const c = new Map(conteneur.current, {
          center: ABIDJAN,
          zoom: 12,
          minZoom: 6,
          maxZoom: 16, // au-delà, la position approximative n'a plus de sens
          mapId: cfg.mapId,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
          fullscreenControl: true,
          fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_TOP },
          gestureHandling: 'cooperative',
          clickableIcons: false,
        })
        c.addListener('click', () => setChoisie(null))
        setCarte(c)
      })
      .catch(() => {
        if (!annule) setIndisponible(true)
      })
    return () => {
      annule = true
    }
  }, [config.data, carte])

  // Repères : recréés à chaque nouvelle page de résultats
  useEffect(() => {
    const c = carte
    const pos = positions.data
    if (!c || !pos) return
    for (const r of reperes.current) r.map = null
    reperes.current = []
    const limites = new google.maps.LatLngBounds()
    for (const a of annonces) {
      const p = pos.get(a.id)
      if (!p) continue
      const pastille = document.createElement('button')
      pastille.type = 'button'
      pastille.textContent = formatPrixCourt(a.prix)
      pastille.setAttribute('aria-label', `${a.titre}, ${formatPrixCourt(a.prix)}`)
      pastille.className = a.verifiee
        ? 'rounded-pill border-2 border-primary-foreground bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-md transition-transform duration-150 hover:scale-110'
        : 'rounded-pill border-2 border-primary bg-card px-2.5 py-1 text-xs font-bold text-primary shadow-md transition-transform duration-150 hover:scale-110'
      const repere = new google.maps.marker.AdvancedMarkerElement({
        map: c,
        position: p,
        content: pastille,
        title: a.titre,
      })
      repere.addListener('gmp-click', () => setChoisie(a.id))
      reperes.current.push(repere)
      limites.extend(p)
    }
    if (reperes.current.length > 1) c.fitBounds(limites, 48)
    else if (reperes.current.length === 1) {
      c.setCenter(limites.getCenter())
      c.setZoom(14)
    }
  }, [carte, positions.data, annonces])

  // Démontage : détache les repères
  useEffect(
    () => () => {
      for (const r of reperes.current) r.map = null
    },
    [],
  )

  const annonceChoisie = annonces.find((a) => a.id === choisie)

  if ((config.isSuccess && !config.data) || indisponible) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        <MapPinOff className="h-8 w-8" aria-hidden />
        <p>La carte est indisponible pour le moment. Passez en vue liste.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border bg-secondary">
        <div ref={conteneur} className="h-[60vh] min-h-[360px] w-full" />
        {annonceChoisie && (
          <div className="absolute inset-x-3 bottom-3 sm:left-auto sm:w-80">
            <button
              type="button"
              onClick={() => setChoisie(null)}
              aria-label="Fermer l’aperçu"
              className="absolute -right-2 -top-2 z-10 rounded-pill border bg-card p-1 shadow-md"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div className="kf-page shadow-lift">
              <CarteAnnonce annonce={annonceChoisie} source="map" sejour={sejour} />
            </div>
          </div>
        )}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Positions approximatives (à quelques centaines de mètres près) : l’adresse exacte vous est donnée par
        l’annonceur.
      </p>
    </div>
  )
}
