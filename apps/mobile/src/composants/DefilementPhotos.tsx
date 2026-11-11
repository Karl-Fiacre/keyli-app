// Photos de l'écran de bienvenue : trois logements réels en défilement
// (fondu enchaîné + zoom lent). Choix du porteur (2026-11-09) ; chaque photo
// est montrée EN ENTIER (2026-11-11) : le cadre occupe l'espace libre entre
// le logo et le texte, l'image y est contenue sans recadrage, et le zoom va
// de 96 % vers l'image complète (jamais au-delà). Photos sous licence
// Unsplash (usage commercial libre) — crédits dans docs/MODULES/mobile.md.
// Si le téléphone demande de réduire les animations, le zoom est coupé et
// seul le fondu reste.
import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native'

const PHOTOS = [
  require('../../assets/bienvenue-1.jpg'), // villa tropicale à l'heure bleue (carrée)
  require('../../assets/bienvenue-2.jpg'), // duplex éclairé de nuit (carrée)
  require('../../assets/bienvenue-3.jpg'), // maison à toit-jardin (16:9)
]
const DUREE = 6000 // temps d'affichage d'une photo (ms)
const FONDU = 1400 // durée du fondu enchaîné (ms)
const DEPART = 0.96 // le zoom part d'un peu plus petit et finit sur l'image entière

export const NOMBRE_PHOTOS = PHOTOS.length

export function DefilementPhotos({
  onPhoto,
  style,
}: {
  onPhoto?: (indice: number) => void
  style?: ViewStyle
}) {
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
        echelles[k].setValue(DEPART)
        Animated.timing(echelles[k], {
          toValue: 1,
          duration: DUREE + FONDU * 2,
          easing: Easing.out(Easing.quad),
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
    <View style={[styles.cadre, style]} pointerEvents="none">
      {PHOTOS.map((source, k) => (
        <Animated.Image
          key={k}
          source={source}
          resizeMode="contain"
          accessible={false}
          style={[styles.photo, { opacity: opacites[k], transform: [{ scale: echelles[k] }] }]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  cadre: { overflow: 'hidden' },
  // Taille explicite : sans elle, l'image peut garder ses 1200 px d'origine
  // au lieu de s'ajuster au cadre (constaté dans l'aperçu web)
  photo: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
})
