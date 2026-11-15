// Villes ouvertes pendant le pilote national (décision du porteur,
// 2026-11-14, docs/MODULES/publicite-pilote-villes.md) : Abidjan, puis la
// vague 2, et Korhogo et Daloa ouvertes dès le pilote (2026-11-15). Seule
// source de ces noms dans l'interface (web et mobile) : ne plus écrire
// « Abidjan » en dur comme seule ville.
export const VILLES_PILOTE = ['Abidjan', 'Bouaké', 'San-Pédro', 'Yamoussoukro', 'Korhogo', 'Daloa'] as const

export type VillePilote = (typeof VILLES_PILOTE)[number]

// « Abidjan, Bouaké, San-Pédro, Yamoussoukro, Korhogo et Daloa »
export function listeVilles(villes: readonly string[] = VILLES_PILOTE): string {
  if (villes.length <= 1) return villes[0] ?? ''
  return `${villes.slice(0, -1).join(', ')} et ${villes[villes.length - 1]}`
}
