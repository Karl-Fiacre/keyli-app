import { erreurKeyli } from '@/partage/lib/erreurs'
import { demanderSignaturesPhotos } from '@/partage/hooks/useAnnonces'
import {
  champsEnvoi,
  COTE_MAX,
  dimensionsReduites,
  lireReponseEnvoi,
  QUALITE_JPEG,
  TAILLE_MAX_OCTETS,
  type EnvoiSigne,
  type SignaturesPhotos,
} from '@/partage/lib/photos'

// Photos des annonces (docs/MODULES/photos.md). Le navigateur envoie chaque
// photo directement à Cloudinary avec une signature délivrée par l'Edge
// Function cloudinary-signature ; aucun secret ne passe par le client.
// Limites, signature et lecture des réponses : communes avec le mobile
// (src/partage/lib/photos.ts).
export { MAX_PHOTOS, MIN_PHOTOS } from '@/partage/lib/photos'

// Réduit et recompresse la photo en JPEG avant l'envoi (un cliché de
// téléphone passe souvent de 4-8 Mo à moins de 1 Mo). En cas d'échec
// (format non lisible par le navigateur), le fichier d'origine est gardé.
export async function compresserPhoto(fichier: File): Promise<Blob> {
  try {
    const image = await createImageBitmap(fichier)
    const { largeur, hauteur } = dimensionsReduites(image.width, image.height, COTE_MAX)
    const toile = document.createElement('canvas')
    toile.width = largeur
    toile.height = hauteur
    const contexte = toile.getContext('2d')
    if (!contexte) return fichier
    contexte.drawImage(image, 0, 0, largeur, hauteur)
    image.close()
    const blob = await new Promise<Blob | null>((ok) => toile.toBlob(ok, 'image/jpeg', QUALITE_JPEG))
    return blob && blob.size < fichier.size ? blob : fichier
  } catch {
    return fichier
  }
}

function envoyerUne(
  signatures: SignaturesPhotos,
  envoi: EnvoiSigne,
  contenu: Blob,
  surProgression: (part: number) => void,
): Promise<string> {
  return new Promise((ok, echec) => {
    const formulaire = new FormData()
    formulaire.append('file', contenu)
    for (const [cle, valeur] of champsEnvoi(signatures, envoi)) formulaire.append(cle, valeur)

    const requete = new XMLHttpRequest()
    requete.open('POST', signatures.url)
    requete.upload.onprogress = (e) => {
      if (e.lengthComputable) surProgression(e.loaded / e.total)
    }
    requete.onload = () => {
      const resultat = lireReponseEnvoi(requete.status, requete.responseText)
      if ('url' in resultat) {
        surProgression(1)
        ok(resultat.url)
      } else {
        echec(erreurKeyli(resultat.erreur))
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

  const data = await demanderSignaturesPhotos(fichiers.length)

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

// Adresse d'affichage optimisée (fonction pure, commune au web et au
// mobile) : voir src/partage/lib/photos.ts
export { urlPhoto } from '@/partage/lib/photos'
