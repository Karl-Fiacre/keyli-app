// Cœur « favori » (cartes et fiche) — mêmes hooks que le web. Sans compte,
// il ouvre la connexion.
import { Pressable, StyleSheet } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSession } from '@/partage/hooks/useSession'
import { useBasculerFavori, useIdsFavoris } from '@/partage/hooks/useFavoris'
import { couleurs, ombreCarte, rayons } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

export function BoutonFavori({ propertyId, titre }: { propertyId: string; titre: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<ParamsRacine>>()
  const { session } = useSession()
  const ids = useIdsFavoris()
  const basculer = useBasculerFavori()
  // Affichage immédiat pendant l'enregistrement
  const enCours = basculer.isPending && basculer.variables?.propertyId === propertyId
  const actif = enCours ? !basculer.variables.actif : !!ids.data?.has(propertyId)

  return (
    <Pressable
      onPress={() =>
        session ? basculer.mutate({ propertyId, actif }) : navigation.navigate('Compte', { screen: 'Connexion' })
      }
      disabled={enCours}
      accessibilityRole="button"
      accessibilityState={{ selected: actif }}
      accessibilityLabel={actif ? `Retirer « ${titre} » des favoris` : `Ajouter « ${titre} » aux favoris`}
      hitSlop={8}
      style={({ pressed }) => [styles.bouton, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={actif ? 'heart' : 'heart-outline'} size={22} color={actif ? couleurs.erreur : couleurs.texte} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bouton: {
    width: 40,
    height: 40,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.fond,
    alignItems: 'center',
    justifyContent: 'center',
    ...ombreCarte,
  },
})
