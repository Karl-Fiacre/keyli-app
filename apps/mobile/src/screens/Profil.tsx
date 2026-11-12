// Profil — identité du compte, publication et vérification (propriétaire,
// agence), abonnement (Sprint 17), favoris, alertes, verrou Face ID /
// empreinte (Sprint 16) et déconnexion. La modification du profil se fait sur le site.
import { useEffect, useState } from 'react'
import { Linking, Text } from 'react-native'
import type { CompositeScreenProps } from '@react-navigation/native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSession } from '@/partage/hooks/useSession'
import { useProfil } from '@/partage/hooks/useProfil'
import { useDeconnexion } from '@/partage/hooks/useCompte'
import { LIBELLES_ROLE } from '@/partage/lib/roles'
import { messageErreur } from '@/partage/lib/erreurs'
import { plateforme } from '@/plateforme'
import { Bouton, CaseACocher, Carte, Chargement, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { desactiverPush } from '@mobile/services/native/notifications'
import { activerVerrou, authentifier, biometrieDisponible, verrouActive } from '@mobile/services/native/biometrie'
import { InvitationConnexion } from '@mobile/composants/InvitationConnexion'
import { couleurs, espaces } from '@mobile/theme/tokens'
import type { ParamsOnglets, ParamsRacine } from '@mobile/navigation/types'

type Props = CompositeScreenProps<BottomTabScreenProps<ParamsOnglets, 'Profil'>, NativeStackScreenProps<ParamsRacine>>

export default function Profil({ navigation }: Props) {
  const { session } = useSession()
  const profil = useProfil()
  const deconnexion = useDeconnexion()
  // Face ID / empreinte disponible sur ce téléphone (null sinon)
  const [methode, setMethode] = useState<string | null>(null)
  const [verrou, setVerrou] = useState(verrouActive)

  useEffect(() => {
    void biometrieDisponible().then(setMethode)
  }, [])

  // Activer demande d'abord une identification réussie
  const basculerVerrou = async (actif: boolean) => {
    if (actif && !(await authentifier(`Activer ${methode ?? 'la biométrie'} pour Keyli`))) return
    activerVerrou(actif)
    setVerrou(actif)
  }

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
      {p && (p.role_keyli === 'owner' || p.role_keyli === 'agency') ? (
        <>
          <Bouton libelle="Publier une annonce" onPress={() => navigation.navigate('PublierAnnonce')} />
          <Bouton
            libelle={p.verified ? 'Vérification du compte ✓' : 'Faire vérifier mon compte'}
            variante="secondaire"
            onPress={() => navigation.navigate('Verification')}
          />
          <Bouton libelle="Mon abonnement" variante="secondaire" onPress={() => navigation.navigate('Abonnement')} />
        </>
      ) : null}
      <Bouton libelle="Mes favoris" variante="secondaire" onPress={() => navigation.navigate('Favoris')} />
      <Bouton libelle="Mes alertes" variante="secondaire" onPress={() => navigation.navigate('Alertes')} />
      <Bouton
        libelle="Gérer mon compte sur le site"
        variante="secondaire"
        onPress={() => void Linking.openURL(plateforme.urlApp('/profil'))}
      />
      {methode ? (
        <CaseACocher coche={verrou} onChange={(v) => void basculerVerrou(v)}>
          <Text style={{ fontSize: 15, color: couleurs.texte }}>Verrouiller Keyli avec {methode}</Text>
          <Text style={{ fontSize: 13, color: couleurs.attenue }}>
            Demandé à chaque ouverture de l'application. Votre mot de passe n'est pas enregistré sur le téléphone.
          </Text>
        </CaseACocher>
      ) : null}
      {deconnexion.isError ? <Message>{messageErreur(deconnexion.error)}</Message> : null}
      <Bouton
        libelle="Se déconnecter"
        onPress={() => {
          // Le verrou appartient à la personne connectée : il est retiré avec elle
          activerVerrou(false)
          setVerrou(false)
          // Ce téléphone ne reçoit plus les notifications du compte (avant
          // la fin de la session, que la règle d'accès exige)
          void desactiverPush()
            .catch((e: unknown) => console.warn('Retrait du jeton push impossible :', e))
            .finally(() => deconnexion.mutate())
        }}
        chargement={deconnexion.isPending}
      />
    </Ecran>
  )
}
