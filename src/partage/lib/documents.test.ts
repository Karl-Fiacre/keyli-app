import { describe, expect, it } from 'vitest'
import { cheminDocument, controleDocument, TAILLE_MAX } from './documents'

describe('controleDocument', () => {
  it('accepte un PDF, un JPEG ou un PNG de 5 Mo au plus', () => {
    expect(controleDocument('application/pdf', 1000)).toBeNull()
    expect(controleDocument('image/jpeg', TAILLE_MAX)).toBeNull()
    expect(controleDocument('image/png', 200_000)).toBeNull()
  })
  it('refuse un autre format', () => {
    expect(controleDocument('image/heic', 1000)).toBe('Format accepté : PDF, JPEG ou PNG.')
  })
  it('refuse un fichier trop lourd ou vide', () => {
    expect(controleDocument('image/jpeg', TAILLE_MAX + 1)).toBe('Fichier trop lourd : 5 Mo au maximum.')
    expect(controleDocument('application/pdf', 0)).toBe('Fichier vide : choisissez un autre document.')
  })
})

describe('cheminDocument', () => {
  it("range le fichier dans le dossier de l'utilisateur avec la bonne extension", () => {
    expect(cheminDocument('u1', 'registre', 'x', 'application/pdf')).toBe('u1/registre-x.pdf')
    expect(cheminDocument('u1', 'acd', 'x', 'image/png')).toBe('u1/acd-x.png')
    expect(cheminDocument('u1', 'cert_residence', 'x', 'image/jpeg')).toBe('u1/cert_residence-x.jpg')
  })
})
