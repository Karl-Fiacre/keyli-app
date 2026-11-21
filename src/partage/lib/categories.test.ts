import { describe, expect, it } from 'vitest'
import { GROUPES_CATEGORIES, filtresCategorie } from './categories'
import { TYPES_BIEN } from './validation'

const toutes = GROUPES_CATEGORIES.flatMap((g) => g.categories)

describe('catégories de l’accueil', () => {
  it('ont des identifiants uniques', () => {
    expect(new Set(toutes.map((c) => c.id)).size).toBe(toutes.length)
  })
  it('ne filtrent que sur des types de biens connus', () => {
    for (const c of toutes) if (c.filtres.type) expect(TYPES_BIEN).toContain(c.filtres.type)
  })
  it('ouvrent la première page, vérifiées d’abord', () => {
    const hotels = toutes.find((c) => c.id === 'hotels')!
    expect(filtresCategorie(hotels)).toEqual({ avantages: [], tri: 'pertinence', page: 1, type: 'hotel' })
  })
})
