// Supprimer mon compte (exigence Google Play / App Store : la suppression
// doit être possible depuis l'application) — même hook et même
// confirmation que le web (src/components/profil/SupprimerCompte.tsx).
// La suppression est faite par la fonction Edge supprimer-compte ; ce qui
// est effacé et ce qui est conservé est détaillé sur /suppression-compte.
import { useState } from 'react'
import { Linking } from 'react-native'
import { MOT_CONFIRMATION_SUPPRESSION, useSupprimerCompte } from '@/partage/hooks/useCompte'
import { messageErreur } from '@/partage/lib/erreurs'
import { plateforme } from '@/plateforme'
import { Bouton, Carte, Champ, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { activerVerrou } from '@mobile/services/native/biometrie'
import { oublierJetonPush } from '@mobile/services/native/notifications'
import { codeApplePourSuppression, ConnexionAnnulee } from '@mobile/services/native/connexionSociale'
import { useSession } from '@/partage/hooks/useSession'
import { espaces } from '@mobile/theme/tokens'

export default function SupprimerCompte() {
  const suppression = useSupprimerCompte()
  const [saisie, setSaisie] = useState('')
  const confirme = saisie.trim().toUpperCase() === MOT_CONFIRMATION_SUPPRESSION
  const { session } = useSession()
  const [erreurApple, setErreurApple] = useState<string | null>(null)
  const compteApple = ((session?.user.app_metadata.providers as string[] | undefined) ?? []).includes('apple')

  async function supprimer() {
    setErreurApple(null)
    // Compte ouvert avec Apple : confirmation Apple pour couper aussi le
    // lien chez Apple (règle App Store 5.1.1(v))
    let codeApple: string | undefined
    if (compteApple) {
      try {
        codeApple = await codeApplePourSuppression()
      } catch (e) {
        setErreurApple(
          e instanceof ConnexionAnnulee
            ? 'Confirmez avec Apple pour supprimer ce compte.'
            : "La confirmation Apple a échoué. Réessayez dans un instant.",
        )
        return
      }
    }
    // La session se ferme à la fin : la navigation revient d'elle-même à l'accueil
    suppression.mutate(
      { confirmation: saisie, codeApple },
      {
        onSuccess: () => {
          activerVerrou(false)
          oublierJetonPush()
        },
      },
    )
  }

  return (
    <Ecran>
      <Titre>Supprimer mon compte</Titre>
      <Carte style={{ gap: espaces.s }}>
        <Texte>Vos annonces sont retirées et vos séjours à venir annulés.</Texte>
        <Texte>Vos messages, avis, favoris, alertes, notifications et documents de vérification sont effacés.</Texte>
        <Texte attenue>
          Les paiements de forfaits sont conservés, rattachés à un compte anonyme, le temps imposé par la loi.
        </Texte>
        <Texte attenue>Cette action est définitive : le compte ne peut pas être récupéré.</Texte>
      </Carte>
      <Bouton
        libelle="En savoir plus"
        variante="lien"
        onPress={() => void Linking.openURL(plateforme.urlApp('/suppression-compte'))}
      />
      <Champ
        libelle={`Pour confirmer, tapez ${MOT_CONFIRMATION_SUPPRESSION}`}
        value={saisie}
        onChangeText={setSaisie}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
      />
      {erreurApple ? <Message>{erreurApple}</Message> : null}
      {suppression.isError ? <Message>{messageErreur(suppression.error)}</Message> : null}
      <Bouton
        libelle="Supprimer définitivement"
        desactive={!confirme}
        chargement={suppression.isPending}
        onPress={() => void supprimer()}
      />
    </Ecran>
  )
}
