// Messages — onglet réservé aux comptes. La messagerie native arrive au
// sprint suivant ; d'ici là, elle s'ouvre sur le site.
import { Linking } from 'react-native'
import { useSession } from '@/partage/hooks/useSession'
import { plateforme } from '@/plateforme'
import { Bouton, Ecran, Texte, Titre } from '@mobile/composants/base'
import { InvitationConnexion } from '@mobile/composants/InvitationConnexion'

export default function Messages() {
  const { session } = useSession()
  if (!session) {
    return (
      <InvitationConnexion
        titre="Vos messages"
        texte="Connectez-vous pour échanger avec les annonceurs par la messagerie Keyli."
      />
    )
  }
  return (
    <Ecran centre>
      <Titre>Vos messages</Titre>
      <Texte attenue>La messagerie arrive bientôt dans l'application. En attendant, retrouvez vos conversations sur le site.</Texte>
      <Bouton libelle="Ouvrir mes messages" onPress={() => void Linking.openURL(plateforme.urlApp('/messages'))} />
    </Ecran>
  )
}
