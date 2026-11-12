// Notifications push dans la navigation (Sprint 17) : enregistre le jeton
// du téléphone quand un compte est connecté, et ouvre l'écran voulu quand
// on touche une notification (message → Messages, vérification →
// Vérification, abonnement → Abonnement, alerte → annonce). Une
// notification touchée avant que la navigation soit prête (démarrage,
// verrou Face ID, CGU) est ouverte dès qu'elle l'est.
import { useCallback, useEffect, useRef } from 'react'
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native'
import { destinationPush, type DestinationPush } from '@/partage/lib/push'
import { activerPush, ecouterOuvertures } from '@mobile/services/native/notifications'
import type { ParamsRacine } from '@mobile/navigation/types'

export function useNotificationsPush(connecte: boolean, navigation: NavigationContainerRefWithCurrent<ParamsRacine>) {
  const enAttente = useRef<DestinationPush | null>(null)
  const connecteRef = useRef(connecte)
  connecteRef.current = connecte

  const ouvrir = useCallback(() => {
    const d = enAttente.current
    // Ces écrans n'existent que pour un compte connecté
    if (!d || !connecteRef.current || !navigation.isReady()) return
    enAttente.current = null
    if (d.ecran === 'Messages' || d.ecran === 'Profil') navigation.navigate('Onglets', { screen: d.ecran })
    else if (d.ecran === 'FicheAnnonce') navigation.navigate('FicheAnnonce', { id: d.id, source: 'lien_direct' })
    else navigation.navigate(d.ecran)
  }, [navigation])

  // Jeton enregistré à chaque connexion (il peut changer d'une fois à l'autre)
  useEffect(() => {
    if (!connecte) return
    activerPush().catch((e: unknown) => console.warn('Notifications push indisponibles :', e))
    ouvrir()
  }, [connecte, ouvrir])

  useEffect(
    () =>
      ecouterOuvertures((donnees) => {
        enAttente.current = destinationPush(donnees)
        ouvrir()
      }),
    [ouvrir],
  )

  return { pret: ouvrir }
}
