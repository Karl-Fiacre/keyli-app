import type { FiltresRecherche, TriRecherche } from '@/hooks/useRecherche'
import type { StatutBien, TypeBien } from '@/hooks/useAnnonces'
import { TYPES_BIEN } from '@/lib/validation'

// Filtres de recherche ↔ paramètres d'URL : une recherche se partage et se
// retrouve avec le bouton « retour » du navigateur.

const TRIS: TriRecherche[] = ['pertinence', 'recent', 'prix_croissant', 'prix_decroissant']

export const LIBELLES_TRI: Record<TriRecherche, string> = {
  pertinence: 'Vérifiées d\'abord',
  recent: 'Plus récentes',
  prix_croissant: 'Prix croissant',
  prix_decroissant: 'Prix décroissant',
}

const nombre = (v: string | null) => {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function lireFiltres(p: URLSearchParams): FiltresRecherche {
  const statut = p.get('statut')
  const type = p.get('type')
  const tri = p.get('tri') as TriRecherche | null
  const meuble = p.get('meuble')
  return {
    statut: statut === 'a_louer' || statut === 'a_vendre' ? (statut as StatutBien) : undefined,
    type: type && (TYPES_BIEN as readonly string[]).includes(type) ? (type as TypeBien) : undefined,
    commune: p.get('commune') || undefined,
    quartier: p.get('quartier') || undefined,
    prixMin: nombre(p.get('prix_min')),
    prixMax: nombre(p.get('prix_max')),
    piecesMin: nombre(p.get('pieces')),
    meuble: meuble === 'oui' ? true : meuble === 'non' ? false : undefined,
    avantages: p.getAll('avantage'),
    tri: tri && TRIS.includes(tri) ? tri : 'pertinence',
    page: Math.max(1, Math.floor(nombre(p.get('page')) ?? 1)),
  }
}

export function ecrireFiltres(f: FiltresRecherche): URLSearchParams {
  const p = new URLSearchParams()
  if (f.statut) p.set('statut', f.statut)
  if (f.type) p.set('type', f.type)
  if (f.commune) p.set('commune', f.commune)
  if (f.quartier) p.set('quartier', f.quartier)
  if (f.prixMin !== undefined) p.set('prix_min', String(f.prixMin))
  if (f.prixMax !== undefined) p.set('prix_max', String(f.prixMax))
  if (f.piecesMin !== undefined) p.set('pieces', String(f.piecesMin))
  if (f.meuble !== undefined) p.set('meuble', f.meuble ? 'oui' : 'non')
  f.avantages.forEach((a) => p.append('avantage', a))
  if (f.tri !== 'pertinence') p.set('tri', f.tri)
  if (f.page > 1) p.set('page', String(f.page))
  return p
}

// Nombre de filtres actifs (hors tri et page), pour le bouton « Filtres »
export function nombreFiltresActifs(f: FiltresRecherche): number {
  return [f.statut, f.type, f.commune, f.quartier, f.prixMin, f.prixMax, f.piecesMin, f.meuble].filter(
    (v) => v !== undefined,
  ).length + f.avantages.length
}
