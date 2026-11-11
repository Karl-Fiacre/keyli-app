// Verrou biométrique (Sprint 16, choix du porteur du 2026-11-11) : la
// session reste enregistrée dans le coffre du téléphone comme avant ; si la
// personne l'active, l'application demande Face ID ou l'empreinte à chaque
// ouverture. Aucun mot de passe n'est conservé sur l'appareil. La biométrie
// ne remplace QUE la saisie du mot de passe : jamais la vérification
// documentaire, toujours contrôlée par l'équipe Keyli.
// Module inclus dans Expo Go : expo-local-authentication (Face ID n'y
// fonctionne pas sur iPhone, seulement dans la version TestFlight).
import * as LocalAuthentication from 'expo-local-authentication'
import { Platform } from 'react-native'
import { plateforme } from '@/plateforme'

const CLE_VERROU = 'keyli.verrou-biometrique'

// Face ID, empreinte… ou null si le téléphone n'a rien d'enregistré
export async function biometrieDisponible(): Promise<string | null> {
  if (Platform.OS === 'web') return null
  const [materiel, enregistree] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ])
  if (!materiel || !enregistree) return null
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'la reconnaissance faciale'
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : "l'empreinte digitale"
  }
  return 'la biométrie'
}

// Demande Face ID / l'empreinte ; le code du téléphone est accepté en
// secours (Face ID qui échoue plusieurs fois)
export async function authentifier(raison: string): Promise<boolean> {
  const resultat = await LocalAuthentication.authenticateAsync({
    promptMessage: raison,
    cancelLabel: 'Annuler',
    fallbackLabel: 'Utiliser le code',
  })
  return resultat.success
}

export function verrouActive(): boolean {
  return plateforme.stockage.lire(CLE_VERROU) === '1'
}

export function activerVerrou(actif: boolean) {
  plateforme.stockage.ecrire(CLE_VERROU, actif ? '1' : '0')
}
