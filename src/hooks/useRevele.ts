import { useEffect, useRef, useState } from 'react'

// Apparition au défilement (docs/ANIMATIONS.md, décision du porteur du
// 2026-11-02) : renvoie une référence à poser sur l'élément et « visible »,
// qui passe à vrai une seule fois quand l'élément entre dans l'écran.
// IntersectionObserver uniquement — aucun écouteur de défilement.
// Navigateur sans IntersectionObserver : visible tout de suite.
export function useRevele<T extends Element>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          setVisible(true)
          observateur.disconnect()
        }
      },
      // Déclenche un peu avant que l'élément n'atteigne le bas de l'écran
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )
    observateur.observe(el)
    return () => observateur.disconnect()
  }, [visible])

  return { ref, visible }
}
