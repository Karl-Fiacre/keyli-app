// Constantes partagées des composants de dashboard (séparées des composants
// pour garder le rafraîchissement à chaud de Vite).

export type EtapeLead = 'nouveau' | 'visite_planifiee' | 'negociation' | 'conclu'

// Étapes du pipeline, dans l'ordre (valeurs de lead_status_keyli)
export const ETAPES_LEAD: Array<{ code: EtapeLead; libelle: string }> = [
  { code: 'nouveau', libelle: 'Nouveau' },
  { code: 'visite_planifiee', libelle: 'Visite planifiée' },
  { code: 'negociation', libelle: 'Négociation' },
  { code: 'conclu', libelle: 'Conclu' },
]

export interface CritereCompare {
  cle: string
  libelle: string
}

// Critères par défaut du comparateur (dashboard Chercheur). L'appelant peut
// en passer d'autres : les lignes et les colonnes sont dynamiques.
export const CRITERES_COMPARAISON: CritereCompare[] = [
  { cle: 'prix', libelle: 'Prix' },
  { cle: 'quartier', libelle: 'Quartier' },
  { cle: 'type', libelle: 'Type' },
  { cle: 'pieces', libelle: 'Pièces' },
  { cle: 'surface', libelle: 'Surface' },
  { cle: 'meuble', libelle: 'Meublé' },
  { cle: 'verifiee', libelle: 'Vérifiée' },
]

// Variation en % d'une période à la précédente. NULL quand la période
// précédente est vide : un pourcentage n'aurait pas de sens.
export function variationPct(actuel: number, precedent: number): number | null {
  if (!precedent) return null
  return Math.round(((actuel - precedent) / precedent) * 100)
}

const LIBELLES_TYPE_COURT: Record<string, string> = {
  maison: 'Maison',
  duplex: 'Duplex',
  villa: 'Villa',
  appartement: 'Appartement',
  studio: 'Studio',
  residence_meublee: 'Résidence meublée',
  auberge: 'Auberge',
  hotel: 'Hôtel',
  bureau: 'Bureau',
  magasin: 'Magasin',
}

// Libellé lisible d'une alerte : « Appartement · à louer · Angré (Cocody) · ≤ 300 000 XOF »
export function libelleAlerte(criteres: Record<string, unknown>, quartier: string | null, commune: string | null) {
  const nombre = (v: unknown) => new Intl.NumberFormat('fr-FR').format(Number(v))
  const morceaux: string[] = []
  if (typeof criteres.type === 'string') morceaux.push(LIBELLES_TYPE_COURT[criteres.type] ?? criteres.type)
  if (criteres.status === 'a_louer') morceaux.push('à louer')
  if (criteres.status === 'a_vendre') morceaux.push('à vendre')
  if (quartier) morceaux.push(commune && commune !== quartier ? `${quartier} (${commune})` : quartier)
  else if (commune) morceaux.push(commune)
  if (criteres.prix_min != null && criteres.prix_max != null)
    morceaux.push(`${nombre(criteres.prix_min)} – ${nombre(criteres.prix_max)} XOF`)
  else if (criteres.prix_max != null) morceaux.push(`≤ ${nombre(criteres.prix_max)} XOF`)
  else if (criteres.prix_min != null) morceaux.push(`≥ ${nombre(criteres.prix_min)} XOF`)
  if (criteres.rooms_min != null) morceaux.push(`${criteres.rooms_min} pièces et +`)
  if (criteres.furnished === true) morceaux.push('meublé')
  if (criteres.rayon_km != null) morceaux.push(`rayon ${criteres.rayon_km} km`)
  return morceaux.length ? morceaux.join(' · ') : 'Alerte de recherche'
}

export type EtatEtape = 'fait' | 'en_cours' | 'a_faire'

interface DocResume {
  doc_type: string
  property_id: string | null
  status: string | null
}

// Étapes de vérification affichées par le VerificationStepper, déduites des
// documents envoyés (le plus récent par type d'abord) et du badge du profil.
// Affichage seulement : la décision reste celle de l'équipe Keyli en base.
export function etapesVerification(role: 'owner' | 'agency', documents: DocResume[], verifie: boolean) {
  const pieces = role === 'agency' ? ['registre'] : ['extrait_naissance', 'cert_residence']
  const dernier = (type: string) => documents.find((d) => d.doc_type === type && d.property_id === null)
  const envoyees = pieces.map(dernier)
  const nonRejetees = envoyees.filter((d) => d && d.status !== 'rejected')
  const acd = documents.find((d) => d.doc_type === 'acd' && d.status !== 'rejected')

  const identite: EtatEtape =
    nonRejetees.length === pieces.length ? 'fait' : nonRejetees.length > 0 ? 'en_cours' : 'a_faire'
  const validation: EtatEtape = envoyees.every((d) => d?.status === 'approved')
    ? 'fait'
    : envoyees.some((d) => d?.status === 'pending')
      ? 'en_cours'
      : 'a_faire'
  return [
    { libelle: role === 'agency' ? 'Registre de commerce' : "Pièces d'identité", etat: identite },
    { libelle: 'ACD d’un bien', etat: (acd ? 'fait' : 'a_faire') as EtatEtape },
    { libelle: 'Validation Keyli', etat: validation },
    { libelle: 'Vérifié', etat: (verifie ? 'fait' : 'a_faire') as EtatEtape },
  ]
}

// Pourcentage signé à la française : « +6,5 % », « −25 % »
export function pctSigne(v: number | string) {
  const n = Number(v)
  const texte = Math.abs(n).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${texte} %`
}
