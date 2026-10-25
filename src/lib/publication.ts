// Statuts de etat_publication_keyli qui permettent de remplir et d'envoyer
// le formulaire de publication (les autres bloquent : sans abonnement,
// registre requis, palier atteint). La base refait toujours le contrôle.
export function publicationPossible(statut: string | undefined) {
  return statut === 'incluse' || statut === 'depassement' || statut === 'couverte_negociee'
}
