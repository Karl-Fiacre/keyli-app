// Fond de l'écran de bienvenue : trois photos réelles de logements en
// défilement (fondu enchaîné + zoom lent), voilées d'un dégradé navy pour
// que le texte reste lisible. Choix du porteur (2026-11-09). Photos sous
// licence Unsplash (usage commercial libre) — crédits dans
// docs/MODULES/mobile.md. Si le téléphone demande de réduire les
// animations, le zoom est coupé et seul le fondu reste.
import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { couleurs } from '@mobile/theme/tokens'

const PHOTOS = [
  require('../../assets/bienvenue-1.jpg'), // villa tropicale à l'heure bleue
  require('../../assets/bienvenue-2.jpg'), // duplex éclairé de nuit
  require('../../assets/bienvenue-3.jpg'), // maison à toit-jardin
]
const DUREE = 6000 // temps d'affichage d'une photo (ms)
const FONDU = 1400 // durée du fondu enchaîné (ms)
const ZOOM = 1.1

export const NOMBRE_PHOTOS = PHOTOS.length

export function DefilementPhotos({ onPhoto }: { onPhoto?: (indice: number) => void }) {
  const opacites = useRef(PHOTOS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current
  const echelles = useRef(PHOTOS.map(() => new Animated.Value(1))).current
  const rappel = useRef(onPhoto)
  rappel.current = onPhoto

  useEffect(() => {
    let annule = false
    let minuteur: ReturnType<typeof setInterval> | undefined
    let indice = 0

    AccessibilityInfo.isReduceMotionEnabled().then((reduit) => {
      if (annule) return
      const zoomer = (k: number) => {
        if (reduit) return
        echelles[k].setValue(1)
        Animated.timing(echelles[k], {
          toValue: ZOOM,
          duration: DUREE + FONDU * 2,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start()
      }
      zoomer(0)
      minuteur = setInterval(() => {
        const suivante = (indice + 1) % PHOTOS.length
        zoomer(suivante)
        Animated.parallel([
          Animated.timing(opacites[indice], { toValue: 0, duration: FONDU, useNativeDriver: true }),
          Animated.timing(opacites[suivante], { toValue: 1, duration: FONDU, useNativeDriver: true }),
        ]).start()
        indice = suivante
        rappel.current?.(suivante)
      }, DUREE)
    })

    return () => {
      annule = true
      if (minuteur) clearInterval(minuteur)
    }
  }, [opacites, echelles])

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PHOTOS.map((source, i) => (
        <Animated.Image
          key={i}
          source={source}
          resizeMode="cover"
          accessible={false}
          style={[styles.photo, { opacity: opacites[i], transform: [{ scale: echelles[i] }] }]}
        />
      ))}

      {/* Voile navy : léger en haut (logo), dense en bas (texte et boutons) */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="voile" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={couleurs.navyLogo} stopOpacity={0.55} />
            <Stop offset="0.16" stopColor={couleurs.navyLogo} stopOpacity={0.05} />
            <Stop offset="0.32" stopColor={couleurs.navyLogo} stopOpacity={0.08} />
            <Stop offset="0.46" stopColor={couleurs.navyLogo} stopOpacity={0.55} />
            <Stop offset="0.56" stopColor={couleurs.navyLogo} stopOpacity={0.96} />
            <Stop offset="0.6" stopColor={couleurs.navyLogo} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#voile)" />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  // Les photos sont remontées (le ciel du haut est rogné) pour que la maison,
  // dans la moitié basse de chaque cliché, reste visible au-dessus du texte ;
  // le bas de l'écran est le navy plein du voile.
  photo: { position: 'absolute', top: '-14%', left: 0, right: 0, height: '72%' },
})
