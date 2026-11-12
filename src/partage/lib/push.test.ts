import { describe, expect, it } from 'vitest'
import { destinationPush } from './push'

describe('destinationPush', () => {
  it('ouvre la messagerie pour un message, une visite ou une réservation', () => {
    expect(destinationPush({ categorie: 'message', property_id: 'b1', expediteur_id: 'u1' })).toEqual({
      ecran: 'Messages',
    })
    expect(destinationPush({ categorie: 'notification', type: 'visite_planifiee' })).toEqual({ ecran: 'Messages' })
    expect(destinationPush({ categorie: 'notification', type: 'reservation_demandee' })).toEqual({ ecran: 'Messages' })
  })
  it("ouvre l'annonce d'une alerte de recherche", () => {
    expect(destinationPush({ categorie: 'notification', type: 'alerte_recherche', property_id: 'b1' })).toEqual({
      ecran: 'FicheAnnonce',
      id: 'b1',
    })
  })
  it('ouvre la vérification ou l’abonnement selon le type', () => {
    expect(destinationPush({ type: 'document_rejete' })).toEqual({ ecran: 'Verification' })
    expect(destinationPush({ type: 'verification_retiree' })).toEqual({ ecran: 'Verification' })
    expect(destinationPush({ type: 'abonnement_expire' })).toEqual({ ecran: 'Abonnement' })
    expect(destinationPush({ type: 'paiement_echoue' })).toEqual({ ecran: 'Abonnement' })
    expect(destinationPush({ type: 'retour_repondu' })).toEqual({ ecran: 'Retours' })
  })
  it('ouvre le profil par défaut ou si les données manquent', () => {
    expect(destinationPush({ type: 'compte_reactive' })).toEqual({ ecran: 'Profil' })
    expect(destinationPush({ type: 'alerte_recherche' })).toEqual({ ecran: 'Profil' })
    expect(destinationPush(null)).toEqual({ ecran: 'Profil' })
  })
})
