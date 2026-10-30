// Formats d'affichage partagés (français, Côte d'Ivoire)

// Montant en francs CFA : « 150 000 XOF »
export const formatXof = (v: number) => `${new Intl.NumberFormat('fr-FR').format(v)} XOF`

// Date courte : « 26/10/2026 »
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR')

// Initiales d'un avatar : « Agence Ivoire Habitat » → « AI »
export function initiales(nom: string) {
  return (
    nom
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((m) => m[0]?.toUpperCase())
      .join('') || 'K'
  )
}
