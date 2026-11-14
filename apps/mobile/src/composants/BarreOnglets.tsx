// Barre d'onglets du bas. Deux styles :
// - « keyli3d » (essai du porteur, 2026-11-14) : fond bleu nuit du logo,
//   coins supérieurs arrondis, ombre portée vers le haut et liseré clair qui
//   donnent du relief, onglet actif dans une bulle turquoise surélevée ;
// - « classique » : barre blanche d'origine.
// Pour revenir à l'ancienne barre : STYLE_BARRE = 'classique'.
import { StyleSheet, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'
import { couleurs, ombreCarte } from '@mobile/theme/tokens'

export const STYLE_BARRE: 'keyli3d' | 'classique' = 'keyli3d'

type Icone = keyof typeof Ionicons.glyphMap

export function optionsBarre(icones: [Icone, Icone]): BottomTabNavigationOptions {
  if (STYLE_BARRE === 'classique') {
    return {
      tabBarActiveTintColor: couleurs.primaire,
      tabBarInactiveTintColor: couleurs.attenue,
      tabBarIcon: ({ focused, color, size }) => <Ionicons name={icones[focused ? 0 : 1]} color={color} size={size} />,
    }
  }
  return {
    tabBarActiveTintColor: couleurs.turquoise,
    tabBarInactiveTintColor: couleurs.texteClair,
    tabBarStyle: styles.barre,
    tabBarItemStyle: styles.onglet,
    tabBarLabelStyle: styles.libelle,
    tabBarIcon: ({ focused, color }) =>
      focused ? (
        <View style={styles.bulle}>
          <Ionicons name={icones[0]} color={couleurs.surPrimaire} size={22} />
        </View>
      ) : (
        <Ionicons name={icones[1]} color={color} size={22} />
      ),
  }
}

const styles = StyleSheet.create({
  barre: {
    backgroundColor: couleurs.navyLogo,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordureClaire, // liseré de lumière : arête du relief
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    height: 74,
    paddingTop: 8,
    // Ombre portée vers le haut : la barre semble posée au-dessus de l'écran
    ...ombreCarte,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  onglet: { paddingVertical: 2 },
  libelle: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  // Onglet actif : bulle turquoise qui sort de la barre, avec son ombre
  bulle: {
    width: 46,
    height: 46,
    marginTop: -22,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.turquoise,
    borderWidth: 3,
    borderColor: couleurs.navyLogo,
    ...ombreCarte,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
})
