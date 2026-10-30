import { useEffect, useRef, useState } from 'react'

const DUREE_MS = 600 // seule exception aux 500 ms (KEYLI_DASHBOARD_DESIGN_SPEC.md 5.2)

// ease-out cubique : départ rapide, arrivée douce
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function mouvementReduit(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// Compteur 0 → cible (valeur de KpiCard), une seule fois au premier
// chargement : une mise à jour ultérieure de la donnée s'affiche directement
// (pas d'écran qui bouge en permanence, spec 5.2). Mouvements réduits : la
// valeur finale tout de suite. Hook sans dépendance (docs/ANIMATIONS.md).
export function useCountUp(cible: number | null | undefined, duree = DUREE_MS): number | null {
  const [valeur, setValeur] = useState<number | null>(cible ?? null)
  const dejaAnime = useRef(false)

  useEffect(() => {
    if (cible === null || cible === undefined || !Number.isFinite(cible)) {
      setValeur(cible ?? null)
      return
    }
    if (dejaAnime.current || mouvementReduit() || cible === 0) {
      dejaAnime.current = true
      setValeur(cible)
      return
    }
    dejaAnime.current = true
    let image = 0
    let fini = false
    const debut = performance.now()
    const pas = (maintenant: number) => {
      const t = Math.min(1, (maintenant - debut) / duree)
      setValeur(cible * easeOut(t))
      if (t < 1) image = requestAnimationFrame(pas)
      else fini = true
    }
    setValeur(0)
    image = requestAnimationFrame(pas)
    return () => {
      cancelAnimationFrame(image)
      // Interrompu avant la fin (démontage, double montage du mode strict) :
      // l'animation pourra rejouer au prochain montage
      if (!fini) dejaAnime.current = false
    }
  }, [cible, duree])

  return valeur
}
