// Aperçu navigateur (expo start --web) : react-native-maps n'existe que sur
// téléphone. La carte du site reste disponible à la même recherche.
import { StyleSheet, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { ResumeAnnonce } from '@/partage/lib/annonce'
import { Texte } from '@mobile/composants/base'
import { couleurs, espaces } from '@mobile/theme/tokens'

export function CarteAnnonces(_: { annonces: ResumeAnnonce[]; onOuvrir: (id: string) => void }) {
  return (
    <View style={styles.zone}>
      <Ionicons name="map-outline" size={40} color={couleurs.attenue} />
      <Texte attenue>La carte s'affiche dans l'application sur téléphone.</Texte>
    </View>
  )
}

const styles = StyleSheet.create({
  zone: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaces.m, padding: espaces.xl },
})
