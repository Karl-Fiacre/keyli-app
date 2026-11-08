// Tests unitaires de la validation des formulaires et des filtres de
// recherche, partagés web / mobile (Sprint 10, docs/LOGIQUE_PARTAGEE.md).
import { describe, expect, it } from 'vitest'
import { robustesseMotDePasse, schemaAnnonce, schemaInscription } from '@/partage/lib/validation'
import {
  criteresAlerte,
  ecrireFiltres,
  lireFiltres,
  memesCriteres,
  nombreFiltresActifs,
  rechercheDepuisAlerte,
} from '@/partage/lib/recherche'

const inscription = {
  role: 'owner',
  prenom: 'Awa',
  nom: 'Koné',
  telephone: '+225 07 07 07 07 07',
  email: 'awa@example.com',
  motDePasse: 'Abidjan2026!',
  confirmation: 'Abidjan2026!',
  cgu: true,
}
const erreursDe = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => i.path.join('.'))

describe('inscription', () => {
  it('accepte une inscription complète', () => {
    expect(schemaInscription.safeParse(inscription).success).toBe(true)
  })
  it('exige l’acceptation des CGU', () => {
    expect(erreursDe(schemaInscription.safeParse({ ...inscription, cgu: false }))).toContain('cgu')
  })
  it('exige deux mots de passe identiques', () => {
    expect(erreursDe(schemaInscription.safeParse({ ...inscription, confirmation: 'autre' }))).toContain('confirmation')
  })
  it('exige le nom de l’agence pour un compte agence', () => {
    expect(erreursDe(schemaInscription.safeParse({ ...inscription, role: 'agency' }))).toContain('nomAgence')
  })
  it('refuse un téléphone qui n’est pas ivoirien', () => {
    expect(erreursDe(schemaInscription.safeParse({ ...inscription, telephone: '+33 6 12 34 56 78' }))).toContain(
      'telephone',
    )
  })
  it('note la robustesse du mot de passe de 0 à 4', () => {
    expect(robustesseMotDePasse('')).toBe(0)
    expect(robustesseMotDePasse('abcdefgh')).toBe(1)
    expect(robustesseMotDePasse('Abidjan2026!xy')).toBe(4)
  })
})

describe('publication d’annonce', () => {
  const annonce = {
    titre: 'Villa à Cocody',
    type: 'villa',
    statut: 'a_louer',
    prix: '350000',
    ville: 'Abidjan',
    meuble: false,
    avantages: [],
    latitude: 5.35,
    longitude: -3.98,
    accepteDepassement: false,
    sejourCourt: false,
  }
  it('convertit le prix saisi en nombre', () => {
    const r = schemaAnnonce.safeParse(annonce)
    expect(r.success && r.data.prix).toBe(350000)
  })
  it('refuse un prix nul et une annonce sans position', () => {
    expect(erreursDe(schemaAnnonce.safeParse({ ...annonce, prix: '0' }))).toContain('prix')
    expect(erreursDe(schemaAnnonce.safeParse({ ...annonce, latitude: undefined }))).toContain('latitude')
  })
})

describe('filtres de recherche', () => {
  it('ignore les valeurs invalides', () => {
    const f = lireFiltres(new URLSearchParams('statut=gratuit&type=chateau&prix_min=-5&tri=hasard&page=0'))
    expect(f.statut).toBeUndefined()
    expect(f.type).toBeUndefined()
    expect(f.prixMin).toBeUndefined()
    expect(f.tri).toBe('pertinence')
    expect(f.page).toBe(1)
  })
  it('relit à l’identique ce qu’il écrit', () => {
    const p = new URLSearchParams(
      'statut=a_louer&type=appartement&commune=c1&prix_max=200000&meuble=oui&avantage=a1&tri=recent',
    )
    const f = lireFiltres(p)
    expect(lireFiltres(ecrireFiltres(f))).toEqual(f)
    expect(nombreFiltresActifs(f)).toBe(6)
  })
  it('transforme les filtres en critères d’alerte et retrouve la recherche', () => {
    const f = lireFiltres(new URLSearchParams('statut=a_vendre&commune=c1&pieces=3&avantage=a1'))
    const c = criteresAlerte(f)
    expect(c).toEqual({ status: 'a_vendre', commune_id: 'c1', rooms_min: 3 })
    expect(memesCriteres(c, { rooms_min: 3, commune_id: 'c1', status: 'a_vendre' })).toBe(true)
    expect(rechercheDepuisAlerte(c)).toBe('/recherche?statut=a_vendre&commune=c1&pieces=3')
  })
})
