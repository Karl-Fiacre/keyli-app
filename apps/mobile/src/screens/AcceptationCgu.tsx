// Acceptation des CGU à la connexion (même règle que PorteCgu du web) : un
// compte qui n'a pas accepté la version en vigueur voit cet écran avant le
// reste de l'application. La base refuse une version périmée.
import { useState } from 'react'
import { Linking, Text } from 'react-native'
import { useAcceptationCgu } from '@/partage/hooks/useCgu'
import { useDeconnexion } from '@/partage/hooks/useCompte'
import { messageErreur } from '@/partage/lib/erreurs'
import { plateforme } from '@/plateforme'
import { Bouton, CaseACocher, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { couleurs } from '@mobile/theme/tokens'

export default function AcceptationCgu({ dejaAcceptees }: { dejaAcceptees: boolean }) {
  const acceptation = useAcceptationCgu()
  const deconnexion = useDeconnexion()
  const [coche, setCoche] = useState(false)
  const lien = { color: couleurs.bleuLogo, textDecorationLine: 'underline' } as const

  return (
    <Ecran centre>
      <Titre>{dejaAcceptees ? 'Nos conditions ont évolué' : "Conditions d'utilisation"}</Titre>
      <Texte attenue>Pour continuer à utiliser votre compte, prenez connaissance des conditions et acceptez-les.</Texte>
      <CaseACocher coche={coche} onChange={setCoche}>
        <Text style={{ color: couleurs.texte, fontSize: 15, lineHeight: 21 }}>
          J'accepte les{' '}
          <Text style={lien} onPress={() => void Linking.openURL(plateforme.urlApp('/conditions'))}>
            conditions générales d'utilisation
          </Text>{' '}
          et j'ai lu la{' '}
          <Text style={lien} onPress={() => void Linking.openURL(plateforme.urlApp('/confidentialite'))}>
            politique de confidentialité
          </Text>
          .
        </Text>
      </CaseACocher>
      {acceptation.isError ? <Message>{messageErreur(acceptation.error)}</Message> : null}
      <Bouton
        libelle="Continuer"
        onPress={() => acceptation.mutate()}
        desactive={!coche}
        chargement={acceptation.isPending}
      />
      <Bouton libelle="Se déconnecter" variante="lien" onPress={() => deconnexion.mutate()} />
    </Ecran>
  )
}
