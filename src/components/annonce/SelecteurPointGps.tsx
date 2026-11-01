import { useEffect, useRef, useState } from 'react'
import { LocateFixed, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfigCarte } from '@/hooks/useAnnonces'
import { chargerGoogleMaps } from '@/lib/googleMaps'

export interface Point {
  latitude: number
  longitude: number
}

// Centre d'Abidjan (pilote) : vue de départ de la carte
const ABIDJAN = { lat: 5.36, lng: -4.0083 }

// Position d'un repère Google Maps, quelle que soit sa forme
function versPoint(p: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude | null | undefined) {
  if (!p) return null
  return typeof p.lat === 'function'
    ? { latitude: (p as google.maps.LatLng).lat(), longitude: (p as google.maps.LatLng).lng() }
    : { latitude: p.lat as number, longitude: p.lng as number }
}

// Point GPS obligatoire de l'annonce : clic (ou glisser du repère) sur la
// carte Google Maps, ou position du navigateur. Sans carte configurée, seule
// « ma position » est proposée.
export function SelecteurPointGps({
  valeur,
  onChange,
  erreur,
}: {
  valeur: Point | null
  onChange: (p: Point) => void
  erreur?: string
}) {
  const config = useConfigCarte()
  const conteneur = useRef<HTMLDivElement>(null)
  const carte = useRef<google.maps.Map | null>(null)
  const marqueur = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const surChangement = useRef(onChange)
  surChangement.current = onChange
  const [localisation, setLocalisation] = useState<'attente' | 'refus' | null>(null)
  const [carteIndisponible, setCarteIndisponible] = useState(false)

  // Chargement de la carte (bibliothèque chargée seulement sur cet écran)
  useEffect(() => {
    const cfg = config.data
    if (!cfg || !conteneur.current || carte.current) return
    let annule = false
    chargerGoogleMaps(cfg.cle)
      .then(() => Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('marker')]))
      .then(([maps, marker]) => {
        if (annule || !conteneur.current) return
        const { Map } = maps as google.maps.MapsLibrary
        const { AdvancedMarkerElement, PinElement } = marker as google.maps.MarkerLibrary
        const c = new Map(conteneur.current, {
          center: ABIDJAN,
          zoom: 12,
          mapId: cfg.mapId,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        })
        // Couleur du repère : token --primary de la charte (src/index.css)
        const primaire = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()})`
        const epingle = new PinElement({ background: primaire, borderColor: primaire, glyphColor: '#ffffff' })
        const m = new AdvancedMarkerElement({
          content: epingle.element,
          gmpDraggable: true,
          title: 'Emplacement du bien',
        })
        m.addListener('dragend', () => {
          const p = versPoint(m.position)
          if (p) surChangement.current(p)
        })
        c.addListener('click', (e: google.maps.MapMouseEvent) => {
          const p = versPoint(e.latLng)
          if (p) surChangement.current(p)
        })
        carte.current = c
        marqueur.current = m
      })
      .catch(() => {
        if (!annule) setCarteIndisponible(true)
      })
    return () => {
      annule = true
    }
  }, [config.data])

  // Démontage : détache le repère
  useEffect(
    () => () => {
      if (marqueur.current) marqueur.current.map = null
      carte.current = null
    },
    [],
  )

  // Le repère suit la valeur du formulaire
  useEffect(() => {
    if (!valeur || !carte.current || !marqueur.current) return
    marqueur.current.position = { lat: valeur.latitude, lng: valeur.longitude }
    marqueur.current.map = carte.current
  }, [valeur])

  const maPosition = () => {
    if (!navigator.geolocation) {
      setLocalisation('refus')
      return
    }
    setLocalisation('attente')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocalisation(null)
        const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
        onChange(p)
        carte.current?.panTo({ lat: p.latitude, lng: p.longitude })
        carte.current?.setZoom(17)
      },
      () => setLocalisation('refus'),
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  return (
    <div className="space-y-3">
      {config.data && !carteIndisponible ? (
        <div
          ref={conteneur}
          className="h-72 w-full overflow-hidden rounded-lg border"
          aria-label="Carte : cliquez pour placer le bien"
        />
      ) : (
        !config.isPending && (
          <p className="text-xs text-muted-foreground">
            Carte bientôt disponible : utilisez votre position, de préférence sur place.
          </p>
        )
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={maPosition} disabled={localisation === 'attente'}>
          <LocateFixed className="mr-2 h-4 w-4" aria-hidden />
          {localisation === 'attente' ? 'Localisation…' : 'Utiliser ma position'}
        </Button>
        {valeur && (
          <span className="flex items-center text-xs text-muted-foreground">
            <MapPin className="mr-1 h-3.5 w-3.5" aria-hidden />
            {valeur.latitude.toFixed(5)}, {valeur.longitude.toFixed(5)}
          </span>
        )}
      </div>
      {localisation === 'refus' && (
        <p className="text-xs text-destructive-texte">
          Position indisponible : autorisez la localisation dans votre navigateur
          {config.data && !carteIndisponible ? ' ou cliquez sur la carte' : ''}.
        </p>
      )}
      {erreur && <p className="text-xs font-medium text-destructive-texte">{erreur}</p>}
    </div>
  )
}
