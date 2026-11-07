import { useEffect } from 'react'

// Titre et description propres à chaque page (Sprint 7, référencement —
// docs/MODULES/ouverture-grand-public.md) : onglet du navigateur, résultats
// des moteurs de recherche. Sans titre : titre générique de Keyli.
const TITRE_DEFAUT = 'Keyli — le logement de confiance à Abidjan'
const DESCRIPTION_DEFAUT =
  'Keyli, l’immobilier de confiance à Abidjan : annonces vérifiées, propriétaires et agences identifiés, avis après visite.'

export function useTitrePage(titre?: string | null, description?: string | null) {
  useEffect(() => {
    document.title = titre ? `${titre} | Keyli` : TITRE_DEFAUT
    const balise = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (balise) balise.content = description || DESCRIPTION_DEFAUT
  }, [titre, description])
}
