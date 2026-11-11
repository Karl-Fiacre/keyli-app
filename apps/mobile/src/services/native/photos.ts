// Photos d'annonce sur téléphone (Sprint 15) : prise de vue avec la caméra,
// choix dans la galerie, compression puis envoi direct à Cloudinary.
// Mêmes limites, même signature et même lecture des réponses que le web
// (src/partage/lib/photos.ts) — seule la manière d'obtenir le fichier change.
// Modules inclus dans Expo Go : expo-image-picker, expo-image-manipulator.
import { Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { demanderSignaturesPhotos } from '@/partage/hooks/useAnnonces'
import { erreurKeyli } from '@/partage/lib/erreurs'
import {
  champsEnvoi,
  COTE_MAX,
  dimensionsReduites,
  lireReponseEnvoi,
  QUALITE_JPEG,
  type EnvoiSigne,
  type SignaturesPhotos,
} from '@/partage/lib/photos'

// Photo choisie sur le téléphone, pas encore envoyée
export interface PhotoLocale {
  cle: string
  uri: string
  largeur: number
  hauteur: number
}

const versPhoto = (a: ImagePicker.ImagePickerAsset): PhotoLocale => ({
  cle: a.assetId ?? `${a.uri}-${Date.now()}-${Math.random()}`,
  uri: a.uri,
  largeur: a.width,
  hauteur: a.height,
})

// Prend une photo avec la caméra. null si la personne annule.
export async function prendrePhoto(): Promise<PhotoLocale | null> {
  const autorisation = await ImagePicker.requestCameraPermissionsAsync()
  if (!autorisation.granted) {
    throw erreurKeyli("Keyli n'a pas accès à la caméra. Autorisez-la dans les réglages du téléphone.")
  }
  const resultat = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
  return resultat.canceled ? null : versPhoto(resultat.assets[0])
}

// Choisit jusqu'à `restant` photos dans la galerie
export async function choisirPhotos(restant: number): Promise<PhotoLocale[]> {
  if (restant <= 0) return []
  const resultat = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: restant,
    orderedSelection: true,
    quality: 1,
  })
  return resultat.canceled ? [] : resultat.assets.slice(0, restant).map(versPhoto)
}

// Réduit la photo (plus long côté à 2 000 px) et la recompresse en JPEG :
// un cliché de téléphone passe de 4-8 Mo à moins de 1 Mo
async function compresser(photo: PhotoLocale): Promise<string> {
  try {
    const { largeur, hauteur } = dimensionsReduites(photo.largeur, photo.hauteur, COTE_MAX)
    const contexte = ImageManipulator.manipulate(photo.uri)
    if (largeur !== photo.largeur) contexte.resize({ width: largeur, height: hauteur })
    const image = await contexte.renderAsync()
    const resultat = await image.saveAsync({ compress: QUALITE_JPEG, format: SaveFormat.JPEG })
    return resultat.uri
  } catch {
    // Compression impossible : la photo d'origine est envoyée
    return photo.uri
  }
}

async function envoyerUne(
  signatures: SignaturesPhotos,
  envoi: EnvoiSigne,
  uri: string,
  surProgression: (part: number) => void,
): Promise<string> {
  const formulaire = new FormData()
  if (Platform.OS === 'web') {
    // Aperçu navigateur : l'adresse locale est lue comme un fichier
    formulaire.append('file', await (await fetch(uri)).blob())
  } else {
    // Téléphone : React Native lit le fichier à partir de son adresse
    formulaire.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob)
  }
  for (const [cle, valeur] of champsEnvoi(signatures, envoi)) formulaire.append(cle, valeur)

  return new Promise((ok, echec) => {
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
  photos: PhotoLocale[],
  surProgression?: (avancement: number) => void,
): Promise<string[]> {
  if (photos.length === 0) return []
  const signatures = await demanderSignaturesPhotos(photos.length)
  const parts = photos.map(() => 0)
  const signaler = () => surProgression?.(parts.reduce((s, p) => s + p, 0) / parts.length)

  // Deux envois à la fois : une connexion mobile ivoirienne sature vite
  const adresses: string[] = new Array(photos.length)
  let suivant = 0
  const travailleur = async () => {
    while (suivant < photos.length) {
      const i = suivant++
      const uri = await compresser(photos[i])
      adresses[i] = await envoyerUne(signatures, signatures.envois[i], uri, (p) => {
        parts[i] = p
        signaler()
      })
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, photos.length) }, travailleur))
  return adresses
}
