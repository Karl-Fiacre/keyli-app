import type { FiltresRecherche } from '@/partage/hooks/useRecherche'

// Catégories de l'accueil (à la manière de Booking, décision du porteur du
// 2026-11-21) : chaque carte ouvre la recherche avec ses filtres. Seuls des
// filtres que la base sait appliquer (rechercher_annonces_keyli) ; une
// catégorie qui en demanderait un autre (restaurants partenaires, à venir)
// attendra son évolution du schéma.

export type IdCategorie =
  | 'sejours'
  | 'hotels'
  | 'residences'
  | 'location'
  | 'achat'
  | 'terrains'
  | 'bureaux'
  | 'magasins'

export interface Categorie {
  id: IdCategorie
  libelle: string
  description: string
  filtres: Partial<FiltresRecherche>
}

export interface GroupeCategories {
  titre: string
  categories: Categorie[]
}

export const GROUPES_CATEGORIES: GroupeCategories[] = [
  {
    titre: 'Séjourner',
    categories: [
      { id: 'sejours', libelle: 'Réserver un séjour', description: 'À la nuit, partout', filtres: { sejour: true } },
      {
        id: 'hotels',
        libelle: 'Hôtels & auberges',
        description: 'Chambres à réserver',
        filtres: { types: ['hotel', 'auberge'] },
      },
      {
        id: 'residences',
        libelle: 'Résidences meublées',
        description: 'Comme à la maison',
        filtres: { type: 'residence_meublee' },
      },
    ],
  },
  {
    titre: 'Se loger',
    categories: [
      { id: 'location', libelle: 'Louer', description: 'Appartements, villas…', filtres: { statut: 'a_louer' } },
      { id: 'achat', libelle: 'Acheter', description: 'Maisons, villas, duplex', filtres: { statut: 'a_vendre' } },
      {
        id: 'terrains',
        libelle: 'Terrains',
        description: 'À bâtir, en vente',
        filtres: { type: 'terrain', statut: 'a_vendre' },
      },
    ],
  },
  {
    titre: 'Professionnels',
    categories: [
      { id: 'bureaux', libelle: 'Bureaux', description: 'À louer ou à vendre', filtres: { type: 'bureau' } },
      { id: 'magasins', libelle: 'Magasins', description: 'Commerces et boutiques', filtres: { type: 'magasin' } },
    ],
  },
]

// Filtres complets d'une catégorie (première page, vérifiées d'abord)
export function filtresCategorie(c: Categorie): FiltresRecherche {
  return { avantages: [], tri: 'pertinence', page: 1, ...c.filtres }
}
