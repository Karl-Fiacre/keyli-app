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

// Prix abrégé pour un repère de carte : « 150 k F », « 1,2 M F »
export function formatPrixCourt(v: number) {
  const nf = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n)
  if (v >= 1_000_000) return `${nf(v / 1_000_000)} M F`
  if (v >= 1_000) return `${nf(Math.round(v / 1_000))} k F`
  return `${nf(v)} F`
}
