// Page ouverte au clic sur une notification, selon son type (types définis
// en base : contrainte notifications_keyli_type_check)
export function lienNotification(type: string, propertyId: string | null): string {
  switch (type) {
    case 'alerte_recherche':
      return propertyId ? `/annonce/${propertyId}?source=lien_direct` : '/recherche'
    case 'visite_planifiee':
    case 'visite_modifiee':
    case 'visite_annulee':
    case 'visite_effectuee':
      return '/messages'
    case 'abonnement_rappel':
    case 'abonnement_expire':
    case 'depassement_cycle':
    case 'recommandation_forfait':
      return '/abonnement'
    case 'verification_retiree':
    case 'compte_suspendu':
    case 'compte_reactive':
      return '/profil'
    default:
      return '/'
  }
}

// « il y a 5 min », « il y a 3 h », puis date courte
export function ilYA(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.round(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.round(heures / 24)
  if (jours < 7) return `il y a ${jours} j`
  return new Date(iso).toLocaleDateString('fr-FR')
}
