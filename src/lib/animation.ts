// Décalage en cascade pour le i-ème élément d'une liste (variable
// --kf-delai lue par kf-cascade et kf-revele, docs/ANIMATIONS.md), plafonné
// pour qu'une longue liste n'attende pas
export function delaiCascade(i: number, pas = 70, max = 420) {
  return { ['--kf-delai' as string]: `${Math.min(i * pas, max)}ms` }
}
