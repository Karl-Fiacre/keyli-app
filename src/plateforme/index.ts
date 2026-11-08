// Services de la plateforme web pour la logique partagée (contrat :
// src/partage/plateforme.ts). L'application mobile fournira son propre
// module `@/plateforme` avec la même interface.
import type { Plateforme } from '@/partage/plateforme'

export const plateforme: Plateforme = {
  stockage: {
    lire(cle) {
      try {
        return localStorage.getItem(cle)
      } catch {
        // Navigation privée stricte, stockage bloqué
        return null
      }
    },
    ecrire(cle, valeur) {
      try {
        localStorage.setItem(cle, valeur)
      } catch {
        // Stockage plein ou bloqué : sans conséquence
      }
    },
  },
  urlApp: (chemin) => `${window.location.origin}${chemin}`,
  nouvelId: () => crypto.randomUUID(),
}
