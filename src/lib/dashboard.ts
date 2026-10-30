// Constantes partagées des composants de dashboard (séparées des composants
// pour garder le rafraîchissement à chaud de Vite).

export type EtapeLead = 'nouveau' | 'visite_planifiee' | 'negociation' | 'conclu'

// Étapes du pipeline, dans l'ordre (valeurs de lead_status_keyli)
export const ETAPES_LEAD: Array<{ code: EtapeLead; libelle: string }> = [
  { code: 'nouveau', libelle: 'Nouveau' },
  { code: 'visite_planifiee', libelle: 'Visite planifiée' },
  { code: 'negociation', libelle: 'Négociation' },
  { code: 'conclu', libelle: 'Conclu' },
]

export interface CritereCompare {
  cle: string
  libelle: string
}

// Critères par défaut du comparateur (dashboard Chercheur). L'appelant peut
// en passer d'autres : les lignes et les colonnes sont dynamiques.
export const CRITERES_COMPARAISON: CritereCompare[] = [
  { cle: 'prix', libelle: 'Prix' },
  { cle: 'quartier', libelle: 'Quartier' },
  { cle: 'type', libelle: 'Type' },
  { cle: 'pieces', libelle: 'Pièces' },
  { cle: 'surface', libelle: 'Surface' },
  { cle: 'meuble', libelle: 'Meublé' },
  { cle: 'verifiee', libelle: 'Vérifiée' },
]
