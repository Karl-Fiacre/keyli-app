// Tests unitaires des règles partagées web / mobile (Sprint 10,
// docs/LOGIQUE_PARTAGEE.md). Ces fonctions sont exécutées à l'identique par
// l'application mobile : un changement de comportement doit casser ces tests.
import { describe, expect, it } from 'vitest'
import { formatPrixCourt, formatXof, initiales } from '@/partage/lib/format'
import {
  formatTaux,
  PHOTOS_CONSEILLEES,
  qualiteAnnonce,
  tauxConversion,
  type FaitsAnnonce,
} from '@/partage/lib/qualite'
import {
  ajouterJours,
  ajouterMois,
  choisirJourSejour,
  grilleMois,
  isoJour,
  isoValide,
  nuitsEntre,
  pluriel,
  premierDuMois,
} from '@/partage/lib/sejour'
import {
  etatBoutonAlerte,
  filtresDepuisAlerte,
  libelleDistance,
  nombreFiltresActifs,
  rechercheDepuisAlerte,
} from '@/partage/lib/recherche'
import { publicationPossible } from '@/partage/lib/publication'
import { cheminConversation } from '@/partage/lib/messagerie'
import { motifRefus, LIBELLES_TENTATIVE } from '@/partage/lib/paiements'
import { erreurKeyli, messageErreur } from '@/partage/lib/erreurs'
import { lienNotification } from '@/partage/lib/notifications'
import { urlPhoto } from '@/partage/lib/photos'

// Intl (fr-FR) sépare les milliers par une espace insécable fine
const sansEspaces = (s: string) => s.replace(/\s/g, ' ')

describe('formats', () => {
  it('affiche un montant en francs CFA', () => {
    expect(sansEspaces(formatXof(150000))).toBe('150 000 XOF')
  })
  it('abrège un prix pour la carte', () => {
    expect(formatPrixCourt(800)).toBe('800 F')
    expect(formatPrixCourt(150000)).toBe('150 k F')
    expect(formatPrixCourt(1_200_000)).toBe('1,2 M F')
  })
  it('calcule les initiales, avec un repli', () => {
    expect(initiales('Agence Ivoire Habitat')).toBe('AI')
    expect(initiales('  ')).toBe('K')
  })
})

describe('qualité des annonces', () => {
  const complete: FaitsAnnonce = {
    nb_photos: PHOTOS_CONSEILLEES,
    a_description: true,
    a_quartier: true,
    a_surface: true,
    a_pieces: true,
    a_position: true,
    annonceur_verifie: true,
  }
  it('donne 100 à une annonce complète, sans conseil', () => {
    expect(qualiteAnnonce(complete)).toEqual({ score: 100, conseils: [] })
  })
  it('compte chaque critère manquant et propose le conseil associé', () => {
    const q = qualiteAnnonce({ ...complete, nb_photos: PHOTOS_CONSEILLEES - 1, a_position: false })
    expect(q.score).toBe(71) // 5 critères sur 7
    expect(q.conseils).toHaveLength(2)
    expect(q.conseils[0]).toMatch(/photos/)
  })
  it('calcule le taux de conversion, null sans visiteur', () => {
    expect(tauxConversion(3, 12)).toBe(25)
    expect(tauxConversion(0, 0)).toBeNull()
    expect(formatTaux(null)).toBe('—')
    expect(formatTaux(12.345)).toBe('12,3 %')
  })
})

describe('dates de séjour', () => {
  it('formate un jour local sans décalage de fuseau', () => {
    expect(isoJour(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
  it('ajoute des jours en changeant de mois et d’année', () => {
    expect(ajouterJours('2026-12-30', 3)).toBe('2027-01-02')
  })
  it('compte les nuits', () => {
    expect(nuitsEntre('2026-11-10', '2026-11-13')).toBe(3)
  })
  it('valide le format AAAA-MM-JJ', () => {
    expect(isoValide('2026-11-08')).toBe(true)
    expect(isoValide('08/11/2026')).toBe(false)
    expect(isoValide(null)).toBe(false)
  })
  it('accorde au pluriel', () => {
    expect(pluriel(1, 'nuit')).toBe('1 nuit')
    expect(pluriel(2, 'nuit')).toBe('2 nuits')
  })
  it('construit la grille d’un mois, lundi en premier', () => {
    // 1er novembre 2026 : un dimanche → 6 cases vides
    const g = grilleMois('2026-11-01')
    expect(g.decalage).toBe(6)
    expect(g.jours).toHaveLength(30)
    expect(g.jours[29]).toBe('2026-11-30')
    expect(grilleMois('2026-02-01').jours).toHaveLength(28)
  })
  it('change de mois', () => {
    expect(ajouterMois('2026-12-01', 1)).toBe('2027-01-01')
    expect(ajouterMois('2026-01-01', -1)).toBe('2025-12-01')
    expect(premierDuMois('2026-11-18')).toBe('2026-11-01')
  })
  it('choisit l’arrivée puis le départ', () => {
    expect(choisirJourSejour(null, null, '2026-11-10')).toEqual({ arrivee: '2026-11-10', depart: null })
    expect(choisirJourSejour('2026-11-10', null, '2026-11-13')).toEqual({ arrivee: '2026-11-10', depart: '2026-11-13' })
    // Jour avant l'arrivée, ou séjour déjà complet : on recommence
    expect(choisirJourSejour('2026-11-10', null, '2026-11-08')).toEqual({ arrivee: '2026-11-08', depart: null })
    expect(choisirJourSejour('2026-11-10', '2026-11-13', '2026-11-20')).toEqual({ arrivee: '2026-11-20', depart: null })
  })
})

describe('alertes de recherche', () => {
  it('retrouve les filtres d’une alerte', () => {
    const f = filtresDepuisAlerte({ commune_id: 'c1', type: 'appartement', status: 'a_louer', prix_max: 300000, furnished: true, rooms_min: 2 })
    expect(f).toMatchObject({ commune: 'c1', type: 'appartement', statut: 'a_louer', prixMax: 300000, meuble: true, piecesMin: 2 })
    expect(f.avantages).toEqual([])
  })
  it('ignore les valeurs inconnues', () => {
    const f = filtresDepuisAlerte({ type: 'chateau', status: 'autre', prix_min: '12' })
    expect(f.type).toBeUndefined()
    expect(f.statut).toBeUndefined()
    expect(f.prixMin).toBeUndefined()
  })
  it('décide de l’état du bouton « Créer une alerte »', () => {
    const base = { avantages: [], tri: 'pertinence' as const, page: 1 }
    expect(etatBoutonAlerte(base, []).vide).toBe(true)
    expect(etatBoutonAlerte({ ...base, avantages: ['a1'] }, []).conseil).toMatch(/équipements ne suffisent pas/)
    const alerte = { id: 'x', actif: false, criteres: { rooms_min: 2, status: 'a_louer' } }
    const e = etatBoutonAlerte({ ...base, statut: 'a_louer', piecesMin: 2 }, [alerte])
    expect(e.existante?.id).toBe('x')
    expect(e.conseil).toBeNull()
    expect(etatBoutonAlerte({ ...base, statut: 'a_louer', avantages: ['a1'] }, []).conseil).toMatch(/pas pris en compte/)
  })
  it('garde le même lien de recherche sur le web', () => {
    expect(rechercheDepuisAlerte({ status: 'a_vendre', rooms_min: 3 })).toBe('/recherche?statut=a_vendre&pieces=3')
  })
})

describe('publication et messagerie', () => {
  it('autorise la publication seulement pour les statuts permis par la base', () => {
    expect(publicationPossible('incluse')).toBe(true)
    expect(publicationPossible('depassement')).toBe(true)
    expect(publicationPossible('couverte_negociee')).toBe(true)
    expect(publicationPossible('sans_abonnement')).toBe(false)
    expect(publicationPossible(undefined)).toBe(false)
  })
  it('construit le chemin d’une conversation, avec ou sans annonce', () => {
    expect(cheminConversation({ property_id: 'p1', interlocuteur: 'u2' })).toBe('/messages/p1/u2')
    expect(cheminConversation({ property_id: null, interlocuteur: 'u2' })).toBe('/messages/direct/u2')
  })
  it('mène une notification de paiement refusé vers l’abonnement', () => {
    expect(lienNotification('paiement_echoue', null)).toBe('/abonnement')
    expect(lienNotification('alerte_recherche', 'p1')).toBe('/annonce/p1?source=lien_direct')
  })
})

describe('paiements', () => {
  it('traduit les motifs de refus courants', () => {
    expect(motifRefus('Insufficient Funds')).toMatch(/Solde insuffisant/)
    expect(motifRefus('Expired Card')).toMatch(/expiré/)
    expect(motifRefus('Do Not Honor')).toMatch(/refusé/)
  })
  it('n’affiche jamais un motif inconnu tel quel', () => {
    expect(motifRefus('Error 0x88 gateway')).toBe('Le paiement a été refusé par la banque ou l’opérateur.')
    expect(motifRefus(null)).toBe('Le paiement n’a pas pu aboutir.')
  })
  it('a un libellé pour chaque statut de tentative', () => {
    expect(Object.keys(LIBELLES_TENTATIVE).sort()).toEqual(['abandoned', 'failed', 'initiated', 'success'])
  })
})

describe('messages d’erreur', () => {
  it('traduit les erreurs de connexion', () => {
    expect(messageErreur({ message: 'Invalid login credentials' })).toBe('Email ou mot de passe incorrect.')
  })
  it('garde le message français d’une règle métier, traduit sinon', () => {
    expect(messageErreur({ code: 'KY001', message: 'missing subscription' })).toMatch(/abonnement actif/)
    expect(messageErreur({ code: '42501', message: 'Action réservée aux administrateurs' })).toBe(
      'Action réservée aux administrateurs',
    )
  })
  it('affiche tel quel un message Keyli et masque l’inconnu', () => {
    expect(messageErreur(erreurKeyli('Photo trop lourde.'))).toBe('Photo trop lourde.')
    expect(messageErreur(new Error('TypeError: x is undefined'))).toMatch(/erreur inattendue/)
  })
})

describe('photos', () => {
  const source = 'https://res.cloudinary.com/djizi4dod/image/upload/keyli/annonces/u/p.jpg'
  it('corrige et réduit une photo Cloudinary, avec ou sans recadrage', () => {
    expect(urlPhoto(source, 640)).toBe(
      'https://res.cloudinary.com/djizi4dod/image/upload/e_improve/e_sharpen:80/f_auto,q_auto,c_limit,w_640/keyli/annonces/u/p.jpg',
    )
    expect(urlPhoto(source, 640, 480)).toContain(
      '/image/upload/e_improve/e_sharpen:80/f_auto,q_auto,c_fill,g_auto,w_640,h_480/',
    )
  })
  it('rend toute autre adresse telle quelle, et rien sans adresse', () => {
    expect(urlPhoto('https://exemple.ci/p.jpg', 640)).toBe('https://exemple.ci/p.jpg')
    expect(urlPhoto(null, 640)).toBeUndefined()
  })
})

describe('recherche par rayon', () => {
  it('affiche une distance approximative, au demi-kilomètre près', () => {
    expect(libelleDistance(2)).toBe('à environ 2 km')
    expect(libelleDistance(4.5)).toBe('à environ 4,5 km')
    expect(libelleDistance(0.2)).toBe('à environ 0,5 km')
    expect(libelleDistance(3.3)).toBe('à environ 3,5 km')
  })
  it("n'affiche rien sans distance", () => {
    expect(libelleDistance(null)).toBeNull()
    expect(libelleDistance(undefined)).toBeNull()
  })
  it('compte le rayon parmi les filtres actifs', () => {
    expect(nombreFiltresActifs({ avantages: [], tri: 'pertinence', page: 1 })).toBe(0)
    expect(
      nombreFiltresActifs({ avantages: [], tri: 'pertinence', page: 1, autour: { lat: 5.36, lng: -4, rayonKm: 5 } }),
    ).toBe(1)
  })
})
