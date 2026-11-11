import { describe, expect, it } from 'vitest'
import { champsEnvoi, dimensionsReduites, lireReponseEnvoi, urlPhoto } from './photos'

describe('dimensionsReduites', () => {
  it('ramène le plus long côté à la limite en gardant les proportions', () => {
    expect(dimensionsReduites(4000, 3000, 2000)).toEqual({ largeur: 2000, hauteur: 1500 })
    expect(dimensionsReduites(3024, 4032, 2000)).toEqual({ largeur: 1500, hauteur: 2000 })
  })
  it("n'agrandit jamais une petite photo", () => {
    expect(dimensionsReduites(800, 600, 2000)).toEqual({ largeur: 800, hauteur: 600 })
  })
})

describe('champsEnvoi', () => {
  it('ajoute la clé publique aux paramètres signés', () => {
    const envoi = { public_id: 'a', allowed_formats: 'jpg', transformation: 't', timestamp: '1', signature: 's' }
    const champs = champsEnvoi({ url: 'u', api_key: 'k', envois: [envoi] }, envoi)
    expect(champs[0]).toEqual(['api_key', 'k'])
    expect(Object.fromEntries(champs)).toMatchObject(envoi)
  })
})

describe('lireReponseEnvoi', () => {
  it("renvoie l'adresse sécurisée d'un envoi réussi", () => {
    expect(lireReponseEnvoi(200, '{"secure_url":"https://res.cloudinary.com/x.jpg"}')).toEqual({
      url: 'https://res.cloudinary.com/x.jpg',
    })
  })
  it('reprend le motif de refus de Cloudinary', () => {
    expect(lireReponseEnvoi(400, '{"error":{"message":"Invalid image file"}}')).toEqual({
      erreur: 'Photo refusée : Invalid image file',
    })
  })
  it('donne un message générique pour une réponse illisible', () => {
    expect(lireReponseEnvoi(502, '<html>')).toEqual({ erreur: 'Envoi de la photo impossible' })
    expect(lireReponseEnvoi(200, '{}')).toEqual({ erreur: 'Envoi de la photo impossible' })
  })
})

describe('urlPhoto', () => {
  it('ajoute les transformations Cloudinary', () => {
    expect(urlPhoto('https://res.cloudinary.com/k/image/upload/v1/a.jpg', 400, 300)).toBe(
      'https://res.cloudinary.com/k/image/upload/f_auto,q_auto,c_fill,g_auto,w_400,h_300/v1/a.jpg',
    )
  })
  it('laisse une autre adresse telle quelle', () => {
    expect(urlPhoto('https://exemple.ci/a.jpg', 400)).toBe('https://exemple.ci/a.jpg')
    expect(urlPhoto(null, 400)).toBeUndefined()
  })
})
