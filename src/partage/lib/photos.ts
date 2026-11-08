// Photos des annonces — règles communes au web et au mobile.

// Adresse d'affichage optimisée par Cloudinary (format et qualité adaptés à
// l'appareil, recadrage aux dimensions voulues). Une autre adresse est
// rendue telle quelle.
export function urlPhoto(url: string | null | undefined, largeur: number, hauteur?: number): string | undefined {
  if (!url) return undefined
  if (!url.startsWith('https://res.cloudinary.com/') || !url.includes('/image/upload/')) return url
  const recadrage = hauteur ? `c_fill,g_auto,w_${largeur},h_${hauteur}` : `c_limit,w_${largeur}`
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,${recadrage}/`)
}
