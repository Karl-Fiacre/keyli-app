// Mes favoris — même liste que le web (useMesFavoris), du plus récent au
// plus ancien. Une annonce qui n'est plus visible reste listée pour pouvoir
// la retirer.
import { FlatList, StyleSheet, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSession } from '@/partage/hooks/useSession'
import { useBasculerFavori, useMesFavoris } from '@/partage/hooks/useFavoris'
import { messageErreur } from '@/partage/lib/erreurs'
import { CarteAnnonce } from '@mobile/composants/CarteAnnonce'
import { InvitationConnexion } from '@mobile/composants/InvitationConnexion'
import { Bouton, Carte, Chargement, Message, Texte } from '@mobile/composants/base'
import { couleurs, espaces } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

export default function Favoris({ navigation }: NativeStackScreenProps<ParamsRacine, 'Favoris'>) {
  const { session } = useSession()
  const favoris = useMesFavoris()
  const retirer = useBasculerFavori()

  if (!session) {
    return <InvitationConnexion titre="Mes favoris" texte="Connectez-vous pour retrouver les annonces que vous aimez." />
  }
  if (favoris.isPending) return <Chargement />

  return (
    <FlatList
      data={favoris.data ?? []}
      keyExtractor={(f) => f.propertyId}
      contentContainerStyle={styles.contenu}
      ItemSeparatorComponent={() => <View style={{ height: espaces.l }} />}
      ListHeaderComponent={favoris.isError ? <Message>{messageErreur(favoris.error)}</Message> : undefined}
      renderItem={({ item }) =>
        item.annonce ? (
          <CarteAnnonce
            annonce={item.annonce}
            onPress={() => navigation.navigate('FicheAnnonce', { id: item.propertyId, source: 'search' })}
          />
        ) : (
          <Carte style={{ gap: espaces.s }}>
            <Texte attenue>Cette annonce n'est plus disponible.</Texte>
            <Bouton
              libelle="Retirer des favoris"
              variante="secondaire"
              chargement={retirer.isPending && retirer.variables?.propertyId === item.propertyId}
              onPress={() => retirer.mutate({ propertyId: item.propertyId, actif: true })}
            />
          </Carte>
        )
      }
      ListEmptyComponent={
        favoris.isError ? undefined : (
          <View style={{ gap: espaces.m }}>
            <Texte attenue>Aucun favori pour l'instant. Touchez le cœur d'une annonce pour la retrouver ici.</Texte>
            <Bouton
              libelle="Rechercher une annonce"
              onPress={() => navigation.navigate('Onglets', { screen: 'Recherche' })}
            />
          </View>
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  contenu: { padding: espaces.xl, backgroundColor: couleurs.fond, flexGrow: 1 },
})
