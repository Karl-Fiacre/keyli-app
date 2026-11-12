// Notifications push (Sprint 17, docs/MODULES/mobile.md) : écran ouvert
// quand on touche une notification. Les données sont jointes au push par
// l'Edge Function envoyer-pushs (categorie, type, property_id,
// expediteur_id). Même logique que les boutons des emails.

export type DestinationPush =
  | { ecran: 'Messages' }
  | { ecran: 'FicheAnnonce'; id: string }
  | { ecran: 'Verification' }
  | { ecran: 'Abonnement' }
  | { ecran: 'Retours' }
  | { ecran: 'Profil' }

export function destinationPush(donnees: Record<string, unknown> | null | undefined): DestinationPush {
  const texte = (cle: string) => (typeof donnees?.[cle] === 'string' ? (donnees[cle] as string) : '')
  const type = texte('type')
  const bien = texte('property_id')
  if (texte('categorie') === 'message') return { ecran: 'Messages' }
  if (type === 'alerte_recherche' && bien) return { ecran: 'FicheAnnonce', id: bien }
  if (type.startsWith('visite_') || type.startsWith('reservation_')) return { ecran: 'Messages' }
  if (type.startsWith('document_') || type === 'verification_retiree') return { ecran: 'Verification' }
  if (type.startsWith('abonnement_') || type === 'depassement_cycle' || type === 'paiement_echoue') {
    return { ecran: 'Abonnement' }
  }
  if (type === 'retour_repondu') return { ecran: 'Retours' }
  return { ecran: 'Profil' }
}
