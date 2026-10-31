import type { FiltresRecherche, TriRecherche } from '@/hooks/useRecherche'
import type { StatutBien, TypeBien } from '@/hooks/useAnnonces'
import { TYPES_BIEN } from '@/lib/validation'

// Filtres de recherche ↔ paramètres d'URL : une recherche se partage et se
// retrouve avec le bouton « retour » du navigateur.

const TRIS: TriRecherche[] = ['pertinence', 'recent', 'prix_croissant', 'prix_decroissant']

export const LIBELLES_TRI: Record<TriRecherche, string> = {
  pertinence: "Vérifiées d'abord",
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
  return (
    [f.statut, f.type, f.commune, f.quartier, f.prixMin, f.prixMax, f.piecesMin, f.meuble].filter(
      (v) => v !== undefined,
    ).length + f.avantages.length
  )
}

// ------------------------------------------------------------
// Alertes de recherche (search_alerts_keyli.criteres)
// Clés acceptées par la base (criteres_alerte_valides_keyli) : commune_id,
// quartier_id, type, status, prix_min, prix_max, rooms_min, furnished.
// Les équipements (avantages) ne font pas partie des critères d'alerte.
// ------------------------------------------------------------
export type CriteresAlerte = Partial<{
  commune_id: string
  quartier_id: string
  type: TypeBien
  status: StatutBien
  prix_min: number
  prix_max: number
  rooms_min: number
  furnished: boolean
}>

export function criteresAlerte(f: FiltresRecherche): CriteresAlerte {
  const c: CriteresAlerte = {}
  if (f.commune) c.commune_id = f.commune
  if (f.quartier) c.quartier_id = f.quartier
  if (f.type) c.type = f.type
  if (f.statut) c.status = f.statut
  if (f.prixMin !== undefined) c.prix_min = f.prixMin
  if (f.prixMax !== undefined) c.prix_max = f.prixMax
  if (f.piecesMin !== undefined) c.rooms_min = f.piecesMin
  if (f.meuble !== undefined) c.furnished = f.meuble
  return c
}

// Même alerte = mêmes critères, quel que soit l'ordre des clés
export function memesCriteres(a: Record<string, unknown>, b: Record<string, unknown>) {
  const cles = (o: Record<string, unknown>) => Object.keys(o).filter((k) => o[k] !== undefined && o[k] !== null)
  const ka = cles(a)
  const kb = cles(b)
  return ka.length === kb.length && ka.every((k) => String(a[k]) === String(b[k]))
}

// Ouvrir la recherche correspondant à une alerte
export function rechercheDepuisAlerte(c: Record<string, unknown>): string {
  const texte = (v: unknown) => (typeof v === 'string' ? v : undefined)
  const nombre = (v: unknown) => (typeof v === 'number' ? v : undefined)
  const statut = texte(c.status)
  const type = texte(c.type)
  const p = ecrireFiltres({
    commune: texte(c.commune_id),
    quartier: texte(c.quartier_id),
    type: type && (TYPES_BIEN as readonly string[]).includes(type) ? (type as TypeBien) : undefined,
    statut: statut === 'a_louer' || statut === 'a_vendre' ? statut : undefined,
    prixMin: nombre(c.prix_min),
    prixMax: nombre(c.prix_max),
    piecesMin: nombre(c.rooms_min),
    meuble: typeof c.furnished === 'boolean' ? c.furnished : undefined,
    avantages: [],
    tri: 'pertinence',
    page: 1,
  })
  return `/recherche?${p.toString()}`
}
