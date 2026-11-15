// Statuts de etat_publication_keyli qui permettent de remplir et d'envoyer
// le formulaire de publication (les autres bloquent : sans abonnement,
// registre requis, palier atteint, plafond du pilote). La base refait
// toujours le contrôle.
export function publicationPossible(statut: string | undefined) {
  return (
    statut === 'incluse' ||
    statut === 'depassement' ||
    statut === 'couverte_negociee' ||
    statut === 'gratuite_pilote'
  )
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

// Dernier jour de la gratuité du pilote : la fin enregistrée par la base est
// exclue (« 2027-03-01 00:00 » → « 28 février 2027 »). Heure d'Abidjan = UTC.
export function dernierJourGratuite(finIso: string): string {
  const d = new Date(new Date(finIso).getTime() - 1)
  return `${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// Message du formulaire pendant le pilote (valeurs calculées par la base)
export function messageGratuitePilote(enLigne: number, plafond: number, finIso: string | null | undefined): string {
  const jusqua = finIso ? `, jusqu'au ${dernierJourGratuite(finIso)} inclus` : ''
  return `Publication gratuite pendant le pilote${jusqua} : ${enLigne} / ${plafond} annonces gratuites en ligne.`
}

export const MESSAGE_PLAFOND_PILOTE = (plafond: number) =>
  `Pendant le pilote, ${plafond} annonces gratuites peuvent être en ligne en même temps. Archivez-en une ou choisissez un forfait pour publier davantage.`
