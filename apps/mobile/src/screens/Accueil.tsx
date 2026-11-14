// Accueil — en-tête fixe (logo et accès à la recherche), présentation courte
// et catalogue (annonces vérifiées d'abord, comme l'accueil du web).
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { FiltresRecherche } from '@/partage/hooks/useRecherche'
import { ListeAnnonces } from '@mobile/composants/ListeAnnonces'
import { Logo, Texte, Titre } from '@mobile/composants/base'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'
import type { ParamsOnglets } from '@mobile/navigation/types'

const CATALOGUE: FiltresRecherche = { avantages: [], tri: 'pertinence', page: 1 }

export default function Accueil({ navigation }: BottomTabScreenProps<ParamsOnglets, 'Accueil'>) {
  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      {/* En-tête fixe : reste visible pendant le défilement du catalogue */}
      <View style={styles.entete}>
        <Logo largeur={104} />
        <Pressable
          onPress={() => navigation.navigate('Recherche')}
          accessibilityRole="button"
          accessibilityLabel="Rechercher un logement"
          style={({ pressed }) => [styles.recherche, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="search" size={17} color={couleurs.surPrimaire} />
          <Text style={styles.texteRecherche}>Rechercher un logement</Text>
        </Pressable>
      </View>
      <ListeAnnonces
        filtres={CATALOGUE}
        entete={
          <View style={styles.presentation}>
            <Titre>Le logement de confiance à Abidjan</Titre>
            <Texte attenue>Annonces vérifiées, contact par la messagerie Keyli, visites organisées.</Texte>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaces.m,
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.s + 2,
    backgroundColor: couleurs.fond,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.xs + 2,
    minHeight: 40,
    paddingHorizontal: espaces.m + 2,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.primaire,
  },
  texteRecherche: { fontSize: 14, fontWeight: '600', color: couleurs.surPrimaire },
  presentation: { gap: espaces.s, marginBottom: espaces.xl },
})
