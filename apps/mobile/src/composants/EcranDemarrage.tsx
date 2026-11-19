// Écran de démarrage animé. Il prend le relais de l'écran natif
// (expo-splash-screen, même fond navy, même logo à la même taille) pour que
// le passage soit invisible, joue une courte animation de marque, puis
// s'efface vers l'application dès que la session est chargée.
// Animations : API Animated de React Native (règle du projet, pas de
// dépendance d'animation web). Si le téléphone demande moins d'animations,
// simple fondu.
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { couleurs, espaces, polices } from '@mobile/theme/tokens'

// Même largeur que `imageWidth` du plugin expo-splash-screen (app.json)
const LARGEUR_LOGO = 200
const HAUTEUR_LOGO = (LARGEUR_LOGO * 287) / 480 // proportions de logo-blanc.png
const DUREE_MIN = 1700 // l'animation de marque se joue en entier
const LARGEUR_BARRE = 120

// Garder l'écran natif affiché tant que l'écran animé n'est pas prêt
SplashScreen.preventAutoHideAsync().catch(() => {})

export function EcranDemarrage({ pret }: { pret: boolean }) {
  const [visible, setVisible] = useState(true)
  const [minimumAtteint, setMinimumAtteint] = useState(false)
  const [reduit, setReduit] = useState<boolean | null>(null)

  const opacite = useRef(new Animated.Value(1)).current
  const echelleLogo = useRef(new Animated.Value(1)).current
  const halo1 = useRef(new Animated.Value(0)).current
  const halo2 = useRef(new Animated.Value(0)).current
  const accroche = useRef(new Animated.Value(0)).current
  const barre = useRef(new Animated.Value(0)).current

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduit)
      .catch(() => setReduit(false))
  }, [])

  // Animation d'entrée, lancée une fois la préférence connue
  useEffect(() => {
    if (reduit === null) return
    const minuterie = setTimeout(() => setMinimumAtteint(true), reduit ? 500 : DUREE_MIN)
    if (reduit) {
      accroche.setValue(1)
      return () => clearTimeout(minuterie)
    }
    const pulsation = (v: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      )
    const p1 = pulsation(halo1)
    const p2 = pulsation(halo2)
    p1.start()
    const decale = setTimeout(() => p2.start(), 800)
    Animated.parallel([
      // Le logo « respire » : léger grossissement puis retour
      Animated.sequence([
        Animated.timing(echelleLogo, { toValue: 1.06, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(echelleLogo, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      ]),
      Animated.timing(accroche, { toValue: 1, duration: 600, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(barre, { toValue: 1, duration: DUREE_MIN, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]).start()
    return () => {
      clearTimeout(minuterie)
      clearTimeout(decale)
      p1.stop()
      p2.stop()
    }
  }, [reduit, accroche, barre, echelleLogo, halo1, halo2])

  // Sortie : session chargée et animation jouée → le logo s'avance, l'écran s'efface
  useEffect(() => {
    if (!pret || !minimumAtteint) return
    Animated.parallel([
      Animated.timing(opacite, { toValue: 0, duration: reduit ? 200 : 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      reduit
        ? Animated.delay(0)
        : Animated.timing(echelleLogo, { toValue: 1.25, duration: 450, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setVisible(false))
  }, [pret, minimumAtteint, reduit, opacite, echelleLogo])

  if (!visible) return null

  const styleHalo = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.45, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] }) }],
  })

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.fond, { opacity: opacite }]}
      // L'écran animé est affiché : on peut retirer l'écran natif identique
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
      accessible
      accessibilityLabel="Keyli, chargement"
      pointerEvents="auto"
    >
      <StatusBar style="light" />
      <View style={styles.centre}>
        <Animated.View style={[styles.halo, styleHalo(halo1)]} />
        <Animated.View style={[styles.halo, styleHalo(halo2)]} />
        <Animated.View style={{ transform: [{ scale: echelleLogo }] }}>
          <Image
            source={require('../../assets/logo-blanc.png')}
            style={{ width: LARGEUR_LOGO, height: HAUTEUR_LOGO }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.accroche,
          {
            opacity: accroche,
            transform: [{ translateY: accroche.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          },
        ]}
      >
        <Text style={styles.titre}>L’immobilier de confiance</Text>
        <Text style={styles.sousTitre}>en Côte d’Ivoire</Text>
      </Animated.View>

      {!reduit && (
        <View style={styles.piste}>
          <Animated.View
            style={[
              styles.barre,
              { transform: [{ translateX: barre.interpolate({ inputRange: [0, 1], outputRange: [-LARGEUR_BARRE, 0] }) }] },
            ]}
          />
        </View>
      )}
    </Animated.View>
  )
}

const TAILLE_HALO = 240

const styles = StyleSheet.create({
  fond: { backgroundColor: couleurs.navyLogo, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  centre: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: TAILLE_HALO,
    height: TAILLE_HALO,
    borderRadius: TAILLE_HALO / 2,
    borderWidth: 2,
    borderColor: couleurs.turquoise,
  },
  // Sous le logo, sans décaler le logo (qui doit rester à la place du natif)
  accroche: { position: 'absolute', top: '50%', marginTop: HAUTEUR_LOGO / 2 + espaces.xxl, alignItems: 'center' },
  titre: { fontFamily: polices.titre, fontSize: 20, color: couleurs.surPrimaire },
  sousTitre: { marginTop: espaces.xs, fontSize: 14, fontWeight: '600', letterSpacing: 1, color: couleurs.turquoise },
  piste: {
    position: 'absolute',
    bottom: 72,
    width: LARGEUR_BARRE,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: couleurs.bordureClaire,
  },
  barre: { width: LARGEUR_BARRE, height: 3, borderRadius: 2, backgroundColor: couleurs.turquoise },
})
