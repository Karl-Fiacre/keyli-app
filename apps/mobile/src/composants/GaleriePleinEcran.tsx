// Galerie en plein écran : photos à faire défiler d'un doigt, compteur et
// fermeture (bouton ou geste retour d'Android).
import { useState } from 'react'
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { urlPhoto } from '@/partage/lib/photos'
import { couleurs, espaces } from '@mobile/theme/tokens'

export function GaleriePleinEcran({
  photos,
  titre,
  depart,
  onFermer,
}: {
  photos: readonly { id: string; url: string }[]
  titre: string
  // Index de la photo ouverte ; null = galerie fermée
  depart: number | null
  onFermer: () => void
}) {
  const { width, height } = useWindowDimensions()
  const [index, setIndex] = useState(0)

  return (
    <Modal
      visible={depart !== null}
      animationType="fade"
      onRequestClose={onFermer}
      onShow={() => setIndex(depart ?? 0)}
      statusBarTranslucent
    >
      <View style={styles.fond}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={depart ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(p) => p.id}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: i }) => (
            <Image
              source={{ uri: urlPhoto(item.url, 1600) }}
              style={{ width, height }}
              resizeMode="contain"
              accessibilityLabel={`Photo ${i + 1} sur ${photos.length} : ${titre}`}
            />
          )}
        />
        <SafeAreaView style={styles.barre} edges={['top']} pointerEvents="box-none">
          <Text style={styles.compteur}>
            {index + 1} / {photos.length}
          </Text>
          <Pressable
            onPress={onFermer}
            accessibilityRole="button"
            accessibilityLabel="Fermer la galerie"
            hitSlop={12}
            style={styles.fermer}
          >
            <Ionicons name="close" size={28} color={couleurs.surPrimaire} />
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.navyLogo },
  barre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaces.l,
    paddingTop: espaces.s,
  },
  compteur: { color: couleurs.surPrimaire, fontSize: 15, fontWeight: '600' },
  fermer: { padding: espaces.xs },
})
