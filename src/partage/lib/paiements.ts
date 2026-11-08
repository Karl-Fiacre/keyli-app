// Libellés des paiements (Sprint 9, docs/MODULES/paiements.md).

// Motif de refus en français. Paystack transmet la réponse de la banque ou
// de l'opérateur Mobile Money telle quelle, en anglais (« gateway
// response ») : les cas courants sont traduits, les autres reçoivent un
// libellé général plutôt qu'un texte technique.
const MOTIFS: [RegExp, string][] = [
  [/insufficient|not enough|solde/i, 'Solde insuffisant sur le compte ou la carte utilisée.'],
  [/expired/i, 'La carte utilisée a expiré.'],
  [/pin/i, 'Code PIN incorrect ou nombre d’essais dépassé.'],
  [/otp|authenticat|3d ?secure/i, 'La validation du paiement (code de confirmation) n’a pas abouti.'],
  [/time ?out|timed out/i, 'Le délai de validation est dépassé.'],
  [/not permitted|restricted|blocked|not allowed/i, 'Ce moyen de paiement n’autorise pas cette opération.'],
  [/invalid card|card number/i, 'Le numéro de carte n’est pas valide.'],
  [/cancel|declined by (user|customer)/i, 'Le paiement a été annulé avant sa validation.'],
  [/do not honou?r|declined/i, 'Le paiement a été refusé par la banque ou l’opérateur.'],
]

export function motifRefus(brut: string | null | undefined): string {
  if (!brut) return 'Le paiement n’a pas pu aboutir.'
  return MOTIFS.find(([motif]) => motif.test(brut))?.[1] ?? 'Le paiement a été refusé par la banque ou l’opérateur.'
}

export type StatutTentative = 'initiated' | 'success' | 'failed' | 'abandoned'

export const LIBELLES_TENTATIVE: Record<StatutTentative, string> = {
  initiated: 'En cours',
  success: 'Réussi',
  failed: 'Échoué',
  abandoned: 'Abandonné',
}
