import { useState } from 'react'

export type VueCatalogue = 'liste' | 'carte'

const CLE = 'keyli_vue_catalogue'

// Liste ou carte : choix mémorisé dans le navigateur (simple confort, la
// liste reste la vue par défaut si le stockage est indisponible).
export function useVueCatalogue() {
  const [vue, setVue] = useState<VueCatalogue>(() => {
    try {
      return localStorage.getItem(CLE) === 'carte' ? 'carte' : 'liste'
    } catch {
      return 'liste'
    }
  })
  const changer = (v: VueCatalogue) => {
    setVue(v)
    try {
      localStorage.setItem(CLE, v)
    } catch {
      // stockage indisponible (navigation privée) : le choix vaut pour cette page
    }
  }
  return [vue, changer] as const
}
