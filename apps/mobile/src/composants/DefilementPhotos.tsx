// Photos de l'écran de bienvenue : trois logements réels en défilement
// (fondu enchaîné + zoom lent). Choix du porteur (2026-11-09).
// Depuis le 2026-11-11, les photos sont en IMAGE DE FOND plein écran, avec un
// zoom à mi-chemin (ZOOM = 0,5) entre « photo entière » (trop petite) et
// « écran rempli » (trop recadrée) : demande du porteur. Un dégradé sombre en
// bas garde le texte lisible. Photos sous licence Unsplash (usage commercial
// libre) — crédits dans docs/MODULES/mobile.md.
// Si le téléphone demande de réduire les animations, le zoom est coupé et
// seul le fondu reste.
import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { couleurs } from '@mobile/theme/tokens'

// Dimensions réelles des fichiers (à mettre à jour si une photo change)
const PHOTOS = [
  { source: require('../../assets/bienvenue-1.jpg'), width: 1200, height: 1200 }, // villa tropicale à l'heure bleue
  { source: require('../../assets/bienvenue-2.jpg'), width: 1200, height: 1200 }, // duplex éclairé de nuit
  { source: require('../../assets/bienvenue-3.jpg'), width: 1200, height: 675 }, // maison à toit-jardin (16:9)
]
const DUREE = 6000 // temps d'affichage d'une photo (ms)
const FONDU = 1400 // durée du fondu enchaîné (ms)
const DEPART = 0.96 // le zoom lent part d'un peu plus petit
// 0 = photo entière dans l'écran, 1 = écran entièrement rempli (recadré)
const ZOOM = 0.5

export const NOMBRE_PHOTOS = PHOTOS.length

// Taille d'affichage d'une photo dans un écran largeur × hauteur
function tailleAffichee(
  { width, height }: { width: number; height: number },
  largeur: number,
  hauteur: number,
) {
  const entiere = Math.min(largeur / width, hauteur / height)
  const remplie = Math.max(largeur / width, hauteur / height)
  const echelle = entiere + (remplie - entiere) * ZOOM
  return { width: width * echelle, height: height * echelle }
}

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
  const [ecran, setEcran] = useState<{ largeur: number; hauteur: number } | null>(null)

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

  const mesurer = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setEcran({ largeur: width, hauteur: height })
  }

  return (
    <View style={[styles.cadre, style]} pointerEvents="none" onLayout={mesurer}>
      {ecran &&
        PHOTOS.map((photo, k) => {
          const taille = tailleAffichee(photo, ecran.largeur, ecran.hauteur)
          return (
            <Animated.Image
              key={k}
              source={photo.source}
              resizeMode="cover"
              accessible={false}
              style={{
                position: 'absolute',
                width: taille.width,
                height: taille.height,
                // centrée en largeur ; en hauteur, centrée vers 40 % de
                // l'écran pour rester visible au-dessus du texte
                left: (ecran.largeur - taille.width) / 2,
                top:
                  taille.height >= ecran.hauteur
                    ? (ecran.hauteur - taille.height) / 2
                    : Math.max(0, ecran.hauteur * 0.4 - taille.height / 2),
                opacity: opacites[k],
                transform: [{ scale: echelles[k] }],
              }}
            />
          )
        })}

      {/* Dégradé : léger en haut (logo), sombre en bas (texte et boutons) */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="voile" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={couleurs.navyLogo} stopOpacity={0.55} />
            <Stop offset="0.18" stopColor={couleurs.navyLogo} stopOpacity={0} />
            <Stop offset="0.42" stopColor={couleurs.navyLogo} stopOpacity={0.15} />
            <Stop offset="0.62" stopColor={couleurs.navyLogo} stopOpacity={0.85} />
            <Stop offset="1" stopColor={couleurs.navyLogo} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#voile)" />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  cadre: { overflow: 'hidden', backgroundColor: couleurs.navyLogo },
})
