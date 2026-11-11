// Photos des annonces — règles communes au web et au mobile
// (docs/MODULES/photos.md). Chaque application envoie les fichiers à sa façon
// (navigateur : File ; téléphone : caméra ou galerie), avec les mêmes limites
// et la même signature délivrée par l'Edge Function cloudinary-signature.

export const MAX_PHOTOS = 10
export const MIN_PHOTOS = 1
// Limite d'un fichier image sur l'offre gratuite de Cloudinary
export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024
// Côté le plus long après compression : suffisant pour un écran large,
// léger sur les réseaux mobiles
export const COTE_MAX = 2000
// Qualité JPEG après compression
export const QUALITE_JPEG = 0.85

// Paramètres signés d'un envoi (un par photo), fournis par la base
export interface EnvoiSigne {
  public_id: string
  allowed_formats: string
  transformation: string
  timestamp: string
  signature: string
}

export interface SignaturesPhotos {
  url: string
  api_key: string
  envois: EnvoiSigne[]
}

// Dimensions après réduction : le plus long côté ramené à coteMax, jamais
// agrandi, proportions conservées
export function dimensionsReduites(
  largeur: number,
  hauteur: number,
  coteMax: number = COTE_MAX,
): { largeur: number; hauteur: number } {
  const echelle = Math.min(1, coteMax / Math.max(largeur, hauteur))
  return { largeur: Math.round(largeur * echelle), hauteur: Math.round(hauteur * echelle) }
}

// Champs du formulaire d'envoi à Cloudinary (hors fichier)
export function champsEnvoi(signatures: SignaturesPhotos, envoi: EnvoiSigne): [string, string][] {
  return [['api_key', signatures.api_key], ...Object.entries(envoi)]
}

// Lecture de la réponse de Cloudinary : adresse de la photo, ou message
// d'erreur à afficher
export function lireReponseEnvoi(statut: number, texte: string): { url: string } | { erreur: string } {
  try {
    const reponse = JSON.parse(texte)
    if (statut === 200 && typeof reponse?.secure_url === 'string') return { url: reponse.secure_url }
    const message = reponse?.error?.message
    return { erreur: typeof message === 'string' ? `Photo refusée : ${message}` : 'Envoi de la photo impossible' }
  } catch {
    return { erreur: 'Envoi de la photo impossible' }
  }
}

// Adresse d'affichage optimisée par Cloudinary (format et qualité adaptés à
// l'appareil, recadrage aux dimensions voulues). Une autre adresse est
// rendue telle quelle.
export function urlPhoto(url: string | null | undefined, largeur: number, hauteur?: number): string | undefined {
  if (!url) return undefined
  if (!url.startsWith('https://res.cloudinary.com/') || !url.includes('/image/upload/')) return url
  const recadrage = hauteur ? `c_fill,g_auto,w_${largeur},h_${hauteur}` : `c_limit,w_${largeur}`
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,${recadrage}/`)
}
