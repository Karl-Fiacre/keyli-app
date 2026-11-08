// Invitation à se connecter, pour les onglets réservés aux comptes
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Bouton, Ecran, Texte, Titre } from '@mobile/composants/base'
import type { ParamsRacine } from '@mobile/navigation/types'

export function InvitationConnexion({ titre, texte }: { titre: string; texte: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<ParamsRacine>>()
  return (
    <Ecran centre>
      <Titre>{titre}</Titre>
      <Texte attenue>{texte}</Texte>
      <Bouton libelle="Se connecter" onPress={() => navigation.navigate('Compte', { screen: 'Connexion' })} />
      <Bouton
        libelle="Créer un compte"
        variante="secondaire"
        onPress={() => navigation.navigate('Compte', { screen: 'Inscription' })}
      />
    </Ecran>
  )
}
