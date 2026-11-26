import { describe, expect, it } from 'vitest'
import { codeTotpValide, grouperSecret, nettoyerCodeTotp } from './doubleAuth'

describe('nettoyerCodeTotp', () => {
  it('retire espaces et tirets', () => {
    expect(nettoyerCodeTotp('123 456')).toBe('123456')
    expect(nettoyerCodeTotp('123-456')).toBe('123456')
  })
  it('coupe à 6 chiffres', () => {
    expect(nettoyerCodeTotp('1234567')).toBe('123456')
  })
  it('ignore les lettres', () => {
    expect(nettoyerCodeTotp('a1b2')).toBe('12')
  })
})

describe('codeTotpValide', () => {
  it('accepte exactement 6 chiffres', () => {
    expect(codeTotpValide('012345')).toBe(true)
  })
  it('refuse un code incomplet ou non numérique', () => {
    expect(codeTotpValide('12345')).toBe(false)
    expect(codeTotpValide('1234567')).toBe(false)
    expect(codeTotpValide('12a456')).toBe(false)
    expect(codeTotpValide('')).toBe(false)
  })
})

describe('grouperSecret', () => {
  it('groupe par 4', () => {
    expect(grouperSecret('ABCDEFGHIJ')).toBe('ABCD EFGH IJ')
  })
  it('ignore les espaces existants', () => {
    expect(grouperSecret('AB CD EF')).toBe('ABCD EF')
  })
  it('chaîne vide', () => {
    expect(grouperSecret('')).toBe('')
  })
})
