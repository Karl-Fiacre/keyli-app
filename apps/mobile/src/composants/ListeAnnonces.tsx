// Liste d'annonces issue de la recherche partagée (useRecherche, même
// fonction de base que le web : rechercher_annonces_keyli). Utilisée par
// l'accueil et la recherche (pied : pagination de la recherche).
import type { ReactElement } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useRecherche, type FiltresRecherche } from '@/partage/hooks/useRecherche'
import { messageErreur } from '@/partage/lib/erreurs'
import { CarteAnnonce } from '@mobile/composants/CarteAnnonce'
import { Message, Texte } from '@mobile/composants/base'
import { couleurs, espaces } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

export function ListeAnnonces({
  filtres,
  entete,
  pied,
}: {
  filtres: FiltresRecherche
  entete?: ReactElement
  pied?: ReactElement | null
}) {
  const navigation = useNavigation<NativeStackNavigationProp<ParamsRacine>>()
  const recherche = useRecherche(filtres)
  const annonces = recherche.data?.annonces ?? []

  return (
    <FlatList
      data={annonces}
      keyExtractor={(a) => a.id}
      contentContainerStyle={styles.contenu}
      ListHeaderComponent={entete}
      ListFooterComponent={annonces.length > 0 ? (pied ?? undefined) : undefined}
      ItemSeparatorComponent={() => <View style={{ height: espaces.l }} />}
      refreshControl={
        <RefreshControl
          refreshing={recherche.isRefetching}
          onRefresh={() => void recherche.refetch()}
          tintColor={couleurs.primaire}
        />
      }
      renderItem={({ item }) => (
        <CarteAnnonce annonce={item} onPress={() => navigation.navigate('FicheAnnonce', { id: item.id })} />
      )}
      ListEmptyComponent={
        recherche.isPending ? (
          <ActivityIndicator color={couleurs.primaire} style={{ marginTop: espaces.xl }} />
        ) : recherche.isError ? (
          <Message>{messageErreur(recherche.error)}</Message>
        ) : (
          <Texte attenue>Aucune annonce ne correspond pour le moment.</Texte>
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  contenu: { padding: espaces.xl, gap: espaces.l, backgroundColor: couleurs.fond, flexGrow: 1 },
})
