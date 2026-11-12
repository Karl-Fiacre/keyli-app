// Notifications push (Sprint 17, choix du porteur du 2026-11-11 : envoi
// direct par Apple et Google). Le téléphone demande l'autorisation, obtient
// son jeton APNs (iPhone) ou FCM (Android) et l'enregistre pour le compte
// connecté ; la déconnexion le retire. Le contenu et l'envoi viennent du
// serveur (Edge Function envoyer-pushs).
// Expo Go ne reçoit pas ces push : il faut la version TestFlight (iPhone)
// ou une version compilée avec google-services.json (Android).
import * as Notifications from 'expo-notifications'
import { isRunningInExpoGo } from 'expo'
import { Platform } from 'react-native'
import { plateforme } from '@/plateforme'
import { enregistrerAppareilPush, retirerAppareilPush } from '@/partage/hooks/usePush'

const CLE_JETON = 'keyli.jeton-push'

// Notification reçue application ouverte : affichée quand même
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

function disponible(): boolean {
  return Platform.OS !== 'web' && !isRunningInExpoGo()
}

// Demande l'autorisation et enregistre le jeton. Sans autorisation ou hors
// version compilée : rien (l'application fonctionne sans push).
export async function activerPush(): Promise<void> {
  if (!disponible()) return
  if (Platform.OS === 'android') {
    // Canal visé par l'Edge Function (android.notification.channel_id)
    await Notifications.setNotificationChannelAsync('keyli', {
      name: 'Keyli',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }
  let { granted } = await Notifications.getPermissionsAsync()
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted
  if (!granted) return
  const { data } = await Notifications.getDevicePushTokenAsync()
  const jeton = String(data)
  await enregistrerAppareilPush(
    jeton,
    Platform.OS === 'ios' ? 'ios' : 'android',
    // Version de développement : serveur APNs de test ; TestFlight et App
    // Store : production
    __DEV__ ? 'sandbox' : 'production',
  )
  plateforme.stockage.ecrire(CLE_JETON, jeton)
}

// À la déconnexion, AVANT de fermer la session : ce téléphone ne reçoit plus
// les notifications du compte
export async function desactiverPush(): Promise<void> {
  const jeton = plateforme.stockage.lire(CLE_JETON)
  if (!jeton) return
  plateforme.stockage.ecrire(CLE_JETON, '')
  await retirerAppareilPush(jeton)
}

// Notification touchée (application ouverte, en arrière-plan ou fermée) :
// données jointes par le serveur
export function ecouterOuvertures(rappel: (donnees: Record<string, unknown>) => void): () => void {
  if (Platform.OS === 'web') return () => {}
  const lire = (r: Notifications.NotificationResponse) =>
    rappel((r.notification.request.content.data ?? {}) as Record<string, unknown>)
  // Application lancée par la notification
  const derniere = Notifications.getLastNotificationResponse()
  if (derniere) lire(derniere)
  const abonnement = Notifications.addNotificationResponseReceivedListener(lire)
  return () => abonnement.remove()
}
