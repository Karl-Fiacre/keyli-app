import { describe, expect, it } from 'vitest'
import { GROUPES_CATEGORIES, filtresCategorie } from './categories'
import { TYPES_BIEN, estTerrain } from './validation'

const toutes = GROUPES_CATEGORIES.flatMap((g) => g.categories)

describe('catégories de l’accueil', () => {
  it('ont des identifiants uniques', () => {
    expect(new Set(toutes.map((c) => c.id)).size).toBe(toutes.length)
  })
  it('ne filtrent que sur des types de biens connus', () => {
    for (const c of toutes) {
      for (const t of [c.filtres.type, ...(c.filtres.types ?? [])]) if (t) expect(TYPES_BIEN).toContain(t)
    }
  })
  it('regroupent hôtels et auberges dans une seule carte', () => {
    const hotels = toutes.find((c) => c.id === 'hotels')!
    expect(filtresCategorie(hotels)).toEqual({ avantages: [], tri: 'pertinence', page: 1, types: ['hotel', 'auberge'] })
  })
  it('proposent les terrains en vente', () => {
    const terrains = toutes.find((c) => c.id === 'terrains')!
    expect(terrains.filtres).toEqual({ type: 'terrain', statut: 'a_vendre' })
  })
})

describe('estTerrain', () => {
  it('ne reconnaît que le type terrain', () => {
    expect(estTerrain('terrain')).toBe(true)
    expect(estTerrain('villa')).toBe(false)
    expect(estTerrain(undefined)).toBe(false)
  })
})
