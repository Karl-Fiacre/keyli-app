// Profil — identité du compte et déconnexion. La modification du profil et
// la vérification arrivent aux sprints suivants (docs/calendrier.md).
import { Linking } from 'react-native'
import { useSession } from '@/partage/hooks/useSession'
import { useProfil } from '@/partage/hooks/useProfil'
import { useDeconnexion } from '@/partage/hooks/useCompte'
import { LIBELLES_ROLE } from '@/partage/lib/roles'
import { messageErreur } from '@/partage/lib/erreurs'
import { plateforme } from '@/plateforme'
import { Bouton, Carte, Chargement, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { InvitationConnexion } from '@mobile/composants/InvitationConnexion'
import { espaces } from '@mobile/theme/tokens'

export default function Profil() {
  const { session } = useSession()
  const profil = useProfil()
  const deconnexion = useDeconnexion()

  if (!session) {
    return (
      <InvitationConnexion
        titre="Votre compte Keyli"
        texte="Connectez-vous pour retrouver vos favoris, vos messages, vos visites et vos annonces."
      />
    )
  }
  if (profil.isPending) return <Chargement />

  const p = profil.data
  return (
    <Ecran>
      <Titre>Mon profil</Titre>
      {profil.isError ? <Message>{messageErreur(profil.error)}</Message> : null}
      {p ? (
        <Carte style={{ gap: espaces.xs }}>
          <Texte>
            {p.first_name} {p.last_name}
          </Texte>
          <Texte attenue>{p.email}</Texte>
          <Texte attenue>{LIBELLES_ROLE[p.role_keyli] ?? p.role_keyli}</Texte>
        </Carte>
      ) : null}
      <Bouton
        libelle="Gérer mon compte sur le site"
        variante="secondaire"
        onPress={() => void Linking.openURL(plateforme.urlApp('/profil'))}
      />
      {deconnexion.isError ? <Message>{messageErreur(deconnexion.error)}</Message> : null}
      <Bouton libelle="Se déconnecter" onPress={() => deconnexion.mutate()} chargement={deconnexion.isPending} />
    </Ecran>
  )
}
