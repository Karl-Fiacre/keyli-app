import { supabase } from '@/integrations/supabase/client'
import { erreurKeyli } from '@/lib/erreurs'

// Photos des annonces (docs/MODULES/photos.md). Le navigateur envoie chaque
// photo directement à Cloudinary avec une signature délivrée par l'Edge
// Function cloudinary-signature ; aucun secret ne passe par le client.

export const MAX_PHOTOS = 10
export const MIN_PHOTOS = 1
// Limite d'un fichier image sur l'offre gratuite de Cloudinary
const TAILLE_MAX_OCTETS = 10 * 1024 * 1024
// Côté le plus long après compression : suffisant pour un écran large,
// léger sur les réseaux mobiles
const COTE_MAX = 2000

interface Envoi {
  public_id: string
  allowed_formats: string
  transformation: string
  timestamp: string
  signature: string
}

interface Signatures {
  url: string
  api_key: string
  envois: Envoi[]
}

// Réduit et recompresse la photo en JPEG avant l'envoi (un cliché de
// téléphone passe souvent de 4-8 Mo à moins de 1 Mo). En cas d'échec
// (format non lisible par le navigateur), le fichier d'origine est gardé.
export async function compresserPhoto(fichier: File): Promise<Blob> {
  try {
    const image = await createImageBitmap(fichier)
    const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height))
    const largeur = Math.round(image.width * echelle)
    const hauteur = Math.round(image.height * echelle)
    const toile = document.createElement('canvas')
    toile.width = largeur
    toile.height = hauteur
    const contexte = toile.getContext('2d')
    if (!contexte) return fichier
    contexte.drawImage(image, 0, 0, largeur, hauteur)
    image.close()
    const blob = await new Promise<Blob | null>((ok) => toile.toBlob(ok, 'image/jpeg', 0.85))
    return blob && blob.size < fichier.size ? blob : fichier
  } catch {
    return fichier
  }
}

function envoyerUne(
  signatures: Signatures,
  envoi: Envoi,
  contenu: Blob,
  surProgression: (part: number) => void,
): Promise<string> {
  return new Promise((ok, echec) => {
    const formulaire = new FormData()
    formulaire.append('file', contenu)
    formulaire.append('api_key', signatures.api_key)
    for (const [cle, valeur] of Object.entries(envoi)) formulaire.append(cle, valeur)

    const requete = new XMLHttpRequest()
    requete.open('POST', signatures.url)
    requete.upload.onprogress = (e) => {
      if (e.lengthComputable) surProgression(e.loaded / e.total)
    }
    requete.onload = () => {
      try {
        const reponse = JSON.parse(requete.responseText)
        if (requete.status === 200 && typeof reponse.secure_url === 'string') {
          surProgression(1)
          ok(reponse.secure_url)
        } else {
          echec(
            erreurKeyli(
              reponse?.error?.message ? `Photo refusée : ${reponse.error.message}` : 'Envoi de la photo impossible',
            ),
          )
        }
      } catch {
        echec(erreurKeyli('Envoi de la photo impossible'))
      }
    }
    requete.onerror = () => echec(erreurKeyli('Connexion perdue pendant l’envoi des photos'))
    requete.send(formulaire)
  })
}

// Envoie les photos (dans l'ordre donné) et renvoie leurs adresses.
// surProgression reçoit l'avancement global, de 0 à 1.
export async function envoyerPhotos(
  fichiers: File[],
  surProgression?: (avancement: number) => void,
): Promise<string[]> {
  if (fichiers.length === 0) return []
  for (const f of fichiers) {
    if (!f.type.startsWith('image/')) throw erreurKeyli(`« ${f.name} » n’est pas une image`)
  }

  const { data, error } = await supabase.functions.invoke<Signatures>('cloudinary-signature', {
    body: { nombre: fichiers.length },
  })
  if (error || !data?.envois || data.envois.length !== fichiers.length) {
    throw erreurKeyli('Envoi de photos indisponible pour le moment. Réessayez dans quelques minutes.')
  }

  const parts = fichiers.map(() => 0)
  const signaler = () => surProgression?.(parts.reduce((s, p) => s + p, 0) / parts.length)

  // Trois envois à la fois : rapide sans saturer une connexion mobile
  const adresses: string[] = new Array(fichiers.length)
  let suivant = 0
  const travailleur = async () => {
    while (suivant < fichiers.length) {
      const i = suivant++
      const contenu = await compresserPhoto(fichiers[i])
      if (contenu.size > TAILLE_MAX_OCTETS) throw erreurKeyli(`« ${fichiers[i].name} » dépasse 10 Mo`)
      adresses[i] = await envoyerUne(data, data.envois[i], contenu, (p) => {
        parts[i] = p
        signaler()
      })
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, fichiers.length) }, travailleur))
  return adresses
}

// Adresse d'affichage optimisée par Cloudinary (format et qualité adaptés au
// navigateur, recadrage aux dimensions voulues). Une autre adresse est
// rendue telle quelle.
export function urlPhoto(url: string | null | undefined, largeur: number, hauteur?: number): string | undefined {
  if (!url) return undefined
  if (!url.startsWith('https://res.cloudinary.com/') || !url.includes('/image/upload/')) return url
  const recadrage = hauteur ? `c_fill,g_auto,w_${largeur},h_${hauteur}` : `c_limit,w_${largeur}`
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,${recadrage}/`)
}
