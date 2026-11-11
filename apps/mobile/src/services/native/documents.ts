// Documents de vérification sur téléphone (Sprint 16) : photographier une
// pièce avec la caméra, la prendre dans la galerie, ou choisir un PDF. Le
// fichier est préparé (photo réduite et lisible, sous 5 Mo) puis envoyé par
// le même hook que le web (useEnvoyerDocument) : même bucket privé, mêmes
// limites, même ligne « en attente ». L'équipe Keyli contrôle TOUJOURS le
// document à la main : rien n'est approuvé automatiquement.
// Modules inclus dans Expo Go : expo-image-picker, expo-image-manipulator,
// expo-document-picker.
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import type { FichierDocument } from '@/partage/hooks/useVerification'
import { dimensionsReduites } from '@/partage/lib/photos'
import { erreurKeyli } from '@/partage/lib/erreurs'

// Une pièce doit rester lisible (petits caractères, tampons) : on garde plus
// de détail que pour une photo d'annonce, tout en restant loin des 5 Mo
const COTE_DOCUMENT = 2400
const QUALITE_DOCUMENT = 0.88

export interface DocumentPrepare {
  fichier: FichierDocument
  // Aperçu affiché avant l'envoi (photo seulement)
  apercu: string | null
  nom: string
}

async function lire(uri: string): Promise<ArrayBuffer> {
  const reponse = await fetch(uri)
  return reponse.arrayBuffer()
}

async function preparerPhoto(asset: ImagePicker.ImagePickerAsset): Promise<DocumentPrepare> {
  const { largeur, hauteur } = dimensionsReduites(asset.width, asset.height, COTE_DOCUMENT)
  const contexte = ImageManipulator.manipulate(asset.uri)
  if (largeur !== asset.width) contexte.resize({ width: largeur, height: hauteur })
  const image = await contexte.renderAsync()
  const resultat = await image.saveAsync({ compress: QUALITE_DOCUMENT, format: SaveFormat.JPEG })
  const donnees = await lire(resultat.uri)
  return {
    fichier: { format: 'image/jpeg', taille: donnees.byteLength, donnees },
    apercu: resultat.uri,
    nom: 'Photo du document',
  }
}

// Photographie la pièce. null si la personne annule.
export async function photographierDocument(): Promise<DocumentPrepare | null> {
  const autorisation = await ImagePicker.requestCameraPermissionsAsync()
  if (!autorisation.granted) {
    throw erreurKeyli("Keyli n'a pas accès à la caméra. Autorisez-la dans les réglages du téléphone.")
  }
  const resultat = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
  return resultat.canceled ? null : preparerPhoto(resultat.assets[0])
}

// Photo déjà prise, choisie dans la galerie
export async function choisirPhotoDocument(): Promise<DocumentPrepare | null> {
  const resultat = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
  return resultat.canceled ? null : preparerPhoto(resultat.assets[0])
}

// PDF (document scanné, reçu par email…), envoyé tel quel
export async function choisirPdf(): Promise<DocumentPrepare | null> {
  const resultat = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true })
  if (resultat.canceled) return null
  const asset = resultat.assets[0]
  const donnees = await lire(asset.uri)
  return {
    fichier: { format: 'application/pdf', taille: donnees.byteLength, donnees },
    apercu: null,
    nom: asset.name,
  }
}
