import { useEffect, useRef, useState } from 'react'
import type { Map as CarteMapbox, Marker } from 'mapbox-gl'
import { LocateFixed, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useJetonMapbox } from '@/hooks/useAnnonces'

export interface Point {
  latitude: number
  longitude: number
}

// Centre d'Abidjan (pilote) : vue de départ de la carte
const ABIDJAN: [number, number] = [-4.0083, 5.36]

// Point GPS obligatoire de l'annonce : clic (ou glisser) sur la carte Mapbox,
// ou position du navigateur. Sans jeton Mapbox configuré, seule « ma
// position » est proposée.
export function SelecteurPointGps({
  valeur,
  onChange,
  erreur,
}: {
  valeur: Point | null
  onChange: (p: Point) => void
  erreur?: string
}) {
  const jeton = useJetonMapbox()
  const conteneur = useRef<HTMLDivElement>(null)
  const carte = useRef<CarteMapbox | null>(null)
  const marqueur = useRef<Marker | null>(null)
  const surChangement = useRef(onChange)
  surChangement.current = onChange
  const [localisation, setLocalisation] = useState<'attente' | 'refus' | null>(null)

  // Chargement de la carte (bibliothèque chargée seulement sur cet écran)
  useEffect(() => {
    if (!jeton.data || !conteneur.current || carte.current) return
    let annule = false
    Promise.all([import('mapbox-gl'), import('mapbox-gl/dist/mapbox-gl.css')]).then(([{ default: mapboxgl }]) => {
      if (annule || !conteneur.current) return
      mapboxgl.accessToken = jeton.data as string
      const c = new mapboxgl.Map({
        container: conteneur.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: ABIDJAN,
        zoom: 11,
      })
      c.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
      // Couleur du marqueur : token --primary de la charte (src/index.css)
      const primaire = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
      const m = new mapboxgl.Marker({ draggable: true, color: `hsl(${primaire})` })
      m.on('dragend', () => {
        const { lng, lat } = m.getLngLat()
        surChangement.current({ latitude: lat, longitude: lng })
      })
      c.on('click', (e) => surChangement.current({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }))
      carte.current = c
      marqueur.current = m
    })
    return () => {
      annule = true
    }
  }, [jeton.data])

  // Démontage : libère la carte
  useEffect(
    () => () => {
      carte.current?.remove()
      carte.current = null
    },
    [],
  )

  // Le marqueur suit la valeur du formulaire
  useEffect(() => {
    if (!valeur || !carte.current || !marqueur.current) return
    marqueur.current.setLngLat([valeur.longitude, valeur.latitude]).addTo(carte.current)
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
        carte.current?.flyTo({ center: [p.longitude, p.latitude], zoom: 16 })
      },
      () => setLocalisation('refus'),
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  return (
    <div className="space-y-3">
      {jeton.data ? (
        <div
          ref={conteneur}
          className="h-72 w-full overflow-hidden rounded-lg border"
          aria-label="Carte : cliquez pour placer le bien"
        />
      ) : (
        !jeton.isPending && (
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
          {jeton.data ? ' ou cliquez sur la carte' : ''}.
        </p>
      )}
      {erreur && <p className="text-xs font-medium text-destructive-texte">{erreur}</p>}
    </div>
  )
}
