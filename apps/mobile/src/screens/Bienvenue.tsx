// Écran de bienvenue : premier écran de l'application pour un visiteur non
// connecté (demande du porteur, 2026-11-09). Trois photos réelles en fond,
// promesse de Keyli, inscription et connexion. La consultation des annonces
// reste libre comme sur le web : « Découvrir les annonces » ouvre
// l'application sans compte.
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { DefilementPhotos, NOMBRE_PHOTOS } from '@mobile/composants/DefilementPhotos'
import { BadgeVerifie } from '@mobile/composants/BadgeVerifie'
import { Bouton, Logo } from '@mobile/composants/base'
import { couleurs, espaces, polices, rayons } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

export default function Bienvenue({ onExplorer }: { onExplorer: () => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<ParamsRacine>>()
  const entree = useRef(new Animated.Value(0)).current
  const [photo, setPhoto] = useState(0)

  // Le texte et les boutons arrivent après la première photo
  useEffect(() => {
    Animated.timing(entree, {
      toValue: 1,
      duration: 700,
      delay: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [entree])

  const glisse = (decalage: number) => ({
    opacity: entree,
    transform: [{ translateY: entree.interpolate({ inputRange: [0, 1], outputRange: [decalage, 0] }) }],
  })

  return (
    <View style={styles.ecran}>
      <StatusBar style="light" />
      <DefilementPhotos onPhoto={setPhoto} />

      <SafeAreaView style={styles.contenu} edges={['top', 'bottom']}>
        <View style={styles.haut}>
          <Logo largeur={150} blanc />
        </View>

        <Animated.View style={[styles.bas, glisse(24)]}>
          <View style={styles.reperes} accessible={false}>
            {Array.from({ length: NOMBRE_PHOTOS }, (_, i) => (
              <View key={i} style={[styles.repere, i === photo && styles.repereActif]} />
            ))}
          </View>
          <View style={styles.lieu}>
            <View style={styles.point} />
            <Text style={styles.texteLieu}>Abidjan · Côte d'Ivoire</Text>
          </View>
          <Text style={styles.titre} accessibilityRole="header">
            Le logement de confiance, <Text style={{ color: couleurs.turquoise }}>vérifié avant vous.</Text>
          </Text>
          <View style={styles.garantie}>
            <BadgeVerifie taille={22} libelle="Badge de vérification Keyli" />
            <Text style={styles.texteGarantie}>
              Biens vérifiés sur le terrain, contact protégé : votre numéro reste privé.
            </Text>
          </View>

          <Animated.View style={[styles.boutons, glisse(36)]}>
            <Bouton
              libelle="Créer un compte"
              variante="clair"
              onPress={() => navigation.navigate('Compte', { screen: 'Inscription' })}
            />
            <Bouton
              libelle="Se connecter"
              variante="contour"
              onPress={() => navigation.navigate('Compte', { screen: 'Connexion' })}
            />
            <Pressable onPress={onExplorer} accessibilityRole="button" hitSlop={8} style={styles.explorer}>
              <Text style={styles.texteExplorer}>Découvrir les annonces sans compte</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.navyLogo },
  contenu: { flex: 1, justifyContent: 'space-between', paddingHorizontal: espaces.xl },
  haut: { alignItems: 'center', paddingTop: espaces.m },
  bas: { gap: espaces.l, paddingBottom: espaces.l },
  lieu: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espaces.s,
    paddingHorizontal: espaces.m,
    paddingVertical: espaces.xs,
    borderRadius: rayons.pilule,
    borderWidth: 1,
    borderColor: couleurs.bordureClaire,
  },
  reperes: { flexDirection: 'row', gap: espaces.s },
  repere: { width: 6, height: 6, borderRadius: 3, backgroundColor: couleurs.bordureClaire },
  repereActif: { width: 18, backgroundColor: couleurs.turquoise },
  point: { width: 6, height: 6, borderRadius: 3, backgroundColor: couleurs.turquoise },
  texteLieu: {
    color: couleurs.surPrimaire,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  titre: { fontFamily: polices.titre, fontSize: 34, lineHeight: 40, fontWeight: '700', color: couleurs.surPrimaire },
  garantie: { flexDirection: 'row', alignItems: 'center', gap: espaces.s },
  texteGarantie: { flex: 1, fontSize: 15, lineHeight: 21, color: couleurs.texteClair },
  boutons: { gap: espaces.m, marginTop: espaces.s },
  explorer: { alignItems: 'center', paddingVertical: espaces.s },
  texteExplorer: { fontSize: 15, fontWeight: '600', color: couleurs.turquoise },
})
