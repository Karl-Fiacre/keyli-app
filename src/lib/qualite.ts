// Qualité d'une annonce (Sprint 8, docs/MODULES/conversion.md) : repère
// d'affichage pour aider l'annonceur, pas une règle métier — rien n'est
// bloqué ni classé avec ce score. Les faits viennent de la base
// (performance_mes_annonces_keyli). Repère de photos : « 5 photos ou plus »
// (docs/SEED_DATA.md) ; la base impose 1 à 10 photos (docs/MODULES/photos.md).
export const PHOTOS_CONSEILLEES = 5

export interface FaitsAnnonce {
  nb_photos: number
  a_description: boolean
  a_quartier: boolean
  a_surface: boolean
  a_pieces: boolean
  a_position: boolean
  annonceur_verifie: boolean
}

interface Critere {
  cle: string
  rempli: (f: FaitsAnnonce) => boolean
  conseil: string
}

const CRITERES: Critere[] = [
  {
    cle: 'photos',
    rempli: (f) => f.nb_photos >= PHOTOS_CONSEILLEES,
    conseil: `Ajoutez des photos (${PHOTOS_CONSEILLEES} ou plus : pièces, extérieur, vue)`,
  },
  { cle: 'description', rempli: (f) => f.a_description, conseil: 'Rédigez une description' },
  { cle: 'quartier', rempli: (f) => f.a_quartier, conseil: 'Indiquez le quartier' },
  { cle: 'surface', rempli: (f) => f.a_surface, conseil: 'Indiquez la surface' },
  { cle: 'pieces', rempli: (f) => f.a_pieces, conseil: 'Indiquez le nombre de pièces' },
  { cle: 'position', rempli: (f) => f.a_position, conseil: 'Placez le bien sur la carte' },
  { cle: 'verifie', rempli: (f) => f.annonceur_verifie, conseil: 'Faites vérifier votre compte (badge)' },
]

// Score de 0 à 100 (part des critères remplis) et conseils restants
export function qualiteAnnonce(f: FaitsAnnonce): { score: number; conseils: string[] } {
  const remplis = CRITERES.filter((c) => c.rempli(f)).length
  return {
    score: Math.round((remplis / CRITERES.length) * 100),
    conseils: CRITERES.filter((c) => !c.rempli(f)).map((c) => c.conseil),
  }
}

// Taux de conversion en %, null sans visiteur
export function tauxConversion(contacts: number, visiteurs: number): number | null {
  return visiteurs > 0 ? (contacts / visiteurs) * 100 : null
}

export function formatTaux(t: number | null): string {
  return t === null ? '—' : `${t.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
}
