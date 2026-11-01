// Chargement de l'API Maps JavaScript de Google, une seule fois par page et
// seulement sur les écrans qui affichent une carte.
// Décision du porteur (2026-10-31) : Google Maps remplace Mapbox.

export interface ConfigCarte {
  cle: string
  mapId: string
}

let chargement: Promise<void> | null = null

export function chargerGoogleMaps(cle: string): Promise<void> {
  // Déjà chargée (navigation entre écrans) : rien à refaire
  if ('google' in window && typeof window.google.maps?.importLibrary === 'function') return Promise.resolve()
  if (chargement) return chargement
  chargement = new Promise<void>((resoudre, rejeter) => {
    const rappel = '__keyliCarteChargee'
    ;(window as unknown as Record<string, () => void>)[rappel] = () => resoudre()
    const script = document.createElement('script')
    const parametres = new URLSearchParams({
      key: cle,
      v: 'weekly',
      loading: 'async',
      language: 'fr',
      region: 'CI',
      callback: rappel,
    })
    script.src = `https://maps.googleapis.com/maps/api/js?${parametres.toString()}`
    script.async = true
    script.onerror = () => {
      chargement = null
      rejeter(new Error('Impossible de charger Google Maps'))
    }
    document.head.appendChild(script)
  })
  return chargement
}
