import type { StatutBien, TypeBien } from '@/partage/hooks/useAnnonces'

// Résumé d'une annonce pour une liste ou une carte de résultats (recherche,
// favoris, annonces similaires)
export interface ResumeAnnonce {
  id: string
  titre: string
  type: TypeBien
  statut: StatutBien
  prix: number
  ville: string
  quartier: string | null
  commune: string | null
  pieces: number | null
  image: string | null
  verifiee: boolean
  sejour_court?: boolean
}
