// Premier message à l'annonceur, dans l'application (messagerie Keyli,
// gratuite, sans paywall — docs/MODULES/messagerie.md). Même logique que le
// formulaire du web (useContacterAnnonceur) : le téléphone reste privé.
import { useState } from 'react'
import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSession } from '@/partage/hooks/useSession'
import { useContacterAnnonceur } from '@/partage/hooks/useRecherche'
import { signalerIntentionContact } from '@/partage/hooks/useConversion'
import { messageErreur } from '@/partage/lib/erreurs'
import { Bouton, Carte, Champ, Message, Texte } from '@mobile/composants/base'
import { espaces } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

export function ContactAnnonceur({
  propertyId,
  destinataire,
  nomDestinataire,
  titreAnnonce,
}: {
  propertyId: string
  destinataire: string
  nomDestinataire?: string
  titreAnnonce: string
}) {
  const { session } = useSession()
  const navigation = useNavigation<NativeStackNavigationProp<ParamsRacine>>()
  const contact = useContacterAnnonceur()
  const [message, setMessage] = useState(
    `Bonjour, votre annonce « ${titreAnnonce} » m'intéresse. Est-elle toujours disponible ?`,
  )

  const ouvrirConversation = () =>
    navigation.navigate('Conversation', {
      propertyId,
      interlocuteur: destinataire,
      nom: nomDestinataire,
      titre: titreAnnonce,
    })

  // Visiteur : connexion d'abord, l'intention de contact est comptée
  if (!session) {
    return (
      <View style={{ gap: espaces.s }}>
        <Bouton
          libelle="Se connecter pour contacter"
          onPress={() => {
            signalerIntentionContact(propertyId)
            navigation.navigate('Compte', { screen: 'Connexion' })
          }}
        />
        <Texte attenue>Compte gratuit : le contact passe par la messagerie Keyli, votre numéro reste privé.</Texte>
      </View>
    )
  }

  // L'annonceur consulte sa propre annonce : rien à envoyer
  if (session.user.id === destinataire) return null

  if (contact.isSuccess) {
    return (
      <View style={{ gap: espaces.s }}>
        <Message type="succes">Message envoyé. L'annonceur vous répondra dans votre messagerie Keyli.</Message>
        <Bouton libelle="Ouvrir la conversation" onPress={ouvrirConversation} />
      </View>
    )
  }

  return (
    <Carte style={{ gap: espaces.m }}>
      <Champ
        libelle="Votre message à l'annonceur"
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={2000}
        textAlignVertical="top"
        style={{ minHeight: 110, paddingTop: espaces.m }}
      />
      {contact.isError ? <Message>{messageErreur(contact.error)}</Message> : null}
      <Bouton
        libelle="Envoyer le message"
        chargement={contact.isPending}
        desactive={!message.trim()}
        onPress={() => {
          // Intention de contact (Sprint 8) : comptée une fois par session et par annonce
          signalerIntentionContact(propertyId)
          contact.mutate({ propertyId, destinataire, message: message.trim() })
        }}
      />
      <Texte attenue>Gratuit, sans engagement. Votre numéro reste privé.</Texte>
    </Carte>
  )
}
