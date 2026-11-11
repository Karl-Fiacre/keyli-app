// Vérification du compte sur téléphone (Sprint 16) — mêmes pièces et même
// circuit que le web (profil + « Mes annonces ») : propriétaire = extrait de
// naissance + certificat de résidence, puis l'ACD de chaque bien ; agence =
// registre de commerce (obligatoire avant la première publication).
// L'équipe Keyli examine chaque document à la main ; la décision arrive en
// notification.
import { View } from 'react-native'
import { useMesAnnonces } from '@/partage/hooks/useAnnonces'
import { useProfil } from '@/partage/hooks/useProfil'
import { dernierDocument, useMesDocuments } from '@/partage/hooks/useVerification'
import { PIECES_COMPTE } from '@/partage/lib/documents'
import { messageErreur } from '@/partage/lib/erreurs'
import { BadgeVerifie } from '@mobile/composants/BadgeVerifie'
import { Chargement, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { EmplacementDocument } from '@mobile/composants/EmplacementDocument'
import { espaces } from '@mobile/theme/tokens'

export default function Verification() {
  const profil = useProfil()
  const documents = useMesDocuments()
  const annonces = useMesAnnonces()

  if (profil.isPending || documents.isPending) return <Chargement />
  const p = profil.data
  const role = p?.role_keyli
  if (role !== 'owner' && role !== 'agency') {
    return (
      <Ecran>
        <Titre>Vérification du compte</Titre>
        <Message>La vérification concerne les comptes propriétaire et agence.</Message>
      </Ecran>
    )
  }

  // ACD : un par bien publié, pour les propriétaires (comme « Mes annonces » du web)
  const biens = role === 'owner' ? (annonces.data ?? []).filter((a) => !a.archived_at) : []

  return (
    <Ecran>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaces.s }}>
        <Titre>Vérification du compte</Titre>
        {p?.verified ? <BadgeVerifie taille={24} libelle="Compte vérifié" /> : null}
      </View>
      <Texte attenue>
        {role === 'agency'
          ? 'Votre registre de commerce doit être approuvé avant votre première publication.'
          : "Une fois ces deux pièces approuvées par l'équipe Keyli, votre profil affiche le badge « Vérifié »."}{' '}
        Vos documents restent privés : seule l'équipe Keyli les consulte.
      </Texte>
      {documents.isError ? <Message>{messageErreur(documents.error)}</Message> : null}

      {PIECES_COMPTE[role].map((type) => (
        <EmplacementDocument key={type} type={type} document={dernierDocument(documents.data, type)} />
      ))}

      {biens.length > 0 ? (
        <>
          <Titre>Vos biens</Titre>
          <Texte attenue>
            L'ACD (Arrêté de concession définitive) approuvé fait afficher le badge « Vérifié » sur l'annonce.
          </Texte>
          {biens.map((b) => (
            <EmplacementDocument
              key={b.id}
              type="acd"
              titre={b.title}
              propertyId={b.id}
              document={dernierDocument(documents.data, 'acd', b.id)}
            />
          ))}
        </>
      ) : null}
    </Ecran>
  )
}
