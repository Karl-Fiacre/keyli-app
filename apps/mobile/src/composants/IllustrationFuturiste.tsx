// Illustration de l'écran de bienvenue : une résidence futuriste à
// terrasses au bord de la lagune, la nuit, aux couleurs de Keyli (navy,
// bleu du logo, turquoise). Dessin original en vectoriel (react-native-svg) :
// net sur tous les écrans, sans image à télécharger.
//
// Plusieurs calques superposés (même cadre, recadrés pour remplir l'écran)
// animés séparément avec l'API Animated : les tours s'élèvent, le halo
// respire, les fenêtres scintillent. Mouvement coupé si le téléphone
// demande de réduire les animations.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { couleurs } from '@mobile/theme/tokens'

// Cadre de dessin (proportions d'un téléphone), recadré sans déformation
const L = 390
const H = 844
// Horizon assez haut pour laisser le bas de l'écran au texte et aux boutons
const HORIZON = 490

// Chaque calque occupe tout l'écran, superposé aux autres
function Calque({ children }: { children: ReactNode }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="xMidYMid slice">
        {children}
      </Svg>
    </View>
  )
}

// Suite pseudo-aléatoire stable (même dessin à chaque ouverture)
function suite(graine: number) {
  let s = graine
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// Fenêtres d'une tour : grille de petites baies, certaines allumées
function fenetres(x: number, y: number, largeur: number, hauteur: number, graine: number, allumees: boolean) {
  const hasard = suite(graine)
  const baies: ReactNode[] = []
  for (let ly = y + 14; ly < y + hauteur - 12; ly += 16) {
    for (let lx = x + 7; lx < x + largeur - 9; lx += 11) {
      const v = hasard()
      // Calque fixe : baies faiblement éclairées ; calque scintillant : quelques baies vives
      if (allumees ? v > 0.82 : v > 0.45) {
        baies.push(
          <Rect
            key={`${lx}-${ly}`}
            x={lx}
            y={ly}
            width={5}
            height={8}
            rx={1}
            fill={allumees ? couleurs.surPrimaire : couleurs.turquoise}
            opacity={allumees ? 0.95 : 0.22 + v * 0.3}
          />,
        )
      }
    }
  }
  return baies
}

// Tours de premier plan (gauche et droite) et résidence centrale
const TOUR_GAUCHE = { x: 22, y: 230, l: 74 }
const TOUR_DROITE = { x: 286, y: 196, l: 72 }
// Dalles de la résidence, du bas vers le haut, décalées en quinconce
const DALLES = Array.from({ length: 8 }, (_, i) => ({
  y: HORIZON - 42 * (i + 1),
  x: i % 2 === 0 ? 128 : 146,
}))

export function IllustrationFuturiste() {
  const [reduire, setReduire] = useState(false)
  const apparition = useRef(new Animated.Value(0)).current
  const halo = useRef(new Animated.Value(0)).current
  const scintille = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let actif = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => actif && setReduire(r))
      .catch(() => undefined)
    return () => {
      actif = false
    }
  }, [])

  useEffect(() => {
    if (reduire) {
      apparition.setValue(1)
      halo.setValue(0.5)
      scintille.setValue(1)
      return
    }
    Animated.timing(apparition, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
    const boucleHalo = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    const boucleFenetres = Animated.loop(
      Animated.sequence([
        Animated.timing(scintille, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scintille, { toValue: 0.25, duration: 2400, useNativeDriver: true }),
      ]),
    )
    boucleHalo.start()
    boucleFenetres.start()
    return () => {
      boucleHalo.stop()
      boucleFenetres.stop()
    }
  }, [reduire, apparition, halo, scintille])

  // Les tours lointaines montent moins vite que le premier plan (profondeur)
  const monte = (distance: number) => ({
    opacity: apparition,
    transform: [{ translateY: apparition.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  })

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Ciel de nuit et étoiles */}
      <Calque>
        <Defs>
          <LinearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={couleurs.navyLogo} />
            <Stop offset="0.4" stopColor={couleurs.primaire} />
            <Stop offset="0.58" stopColor={couleurs.turquoise} stopOpacity={0.3} />
            <Stop offset="0.66" stopColor={couleurs.navyLogo} />
            <Stop offset="1" stopColor={couleurs.navyLogo} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={L} height={H} fill="url(#ciel)" />
        {[
          [40, 90, 1.2],
          [96, 150, 0.8],
          [160, 70, 1],
          [250, 120, 1.3],
          [330, 80, 0.9],
          [355, 170, 0.7],
          [70, 220, 0.7],
          [300, 200, 1],
        ].map(([x, y, r]) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={couleurs.surPrimaire} opacity={0.7} />
        ))}
      </Calque>

      {/* Halo turquoise qui respire derrière la résidence */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
        ]}
      >
        <Calque>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={couleurs.turquoise} stopOpacity={0.55} />
              <Stop offset="0.6" stopColor={couleurs.turquoise} stopOpacity={0.12} />
              <Stop offset="1" stopColor={couleurs.turquoise} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={L / 2} cy={270} r={210} fill="url(#halo)" />
        </Calque>
      </Animated.View>

      {/* Tours lointaines */}
      <Animated.View style={[StyleSheet.absoluteFill, monte(30)]}>
        <Calque>
          <G fill={couleurs.bleuLogo} opacity={0.22}>
            <Rect x={0} y={310} width={42} height={HORIZON - 310} rx={4} />
            <Rect x={40} y={250} width={30} height={HORIZON - 250} rx={4} />
            <Rect x={98} y={338} width={40} height={HORIZON - 338} rx={4} />
            <Rect x={250} y={322} width={34} height={HORIZON - 322} rx={4} />
            <Rect x={330} y={290} width={60} height={HORIZON - 290} rx={4} />
            <Path d={`M352 ${HORIZON} V230 Q368 210 384 230 V${HORIZON} Z`} />
          </G>
        </Calque>
      </Animated.View>

      {/* Premier plan : deux tours vitrées et la résidence à terrasses */}
      <Animated.View style={[StyleSheet.absoluteFill, monte(70)]}>
        <Calque>
          <Defs>
            <LinearGradient id="verre" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={couleurs.navyLogo} />
              <Stop offset="1" stopColor={couleurs.primaire} />
            </LinearGradient>
            <LinearGradient id="bande" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={couleurs.turquoise} stopOpacity={0.15} />
              <Stop offset="0.5" stopColor={couleurs.turquoise} stopOpacity={0.75} />
              <Stop offset="1" stopColor={couleurs.turquoise} stopOpacity={0.15} />
            </LinearGradient>
          </Defs>

          {/* Tour de gauche, sommet arrondi */}
          <Path
            d={`M${TOUR_GAUCHE.x} ${HORIZON} V${TOUR_GAUCHE.y + 30} Q${TOUR_GAUCHE.x + TOUR_GAUCHE.l / 2} ${TOUR_GAUCHE.y - 24} ${TOUR_GAUCHE.x + TOUR_GAUCHE.l} ${TOUR_GAUCHE.y + 30} V${HORIZON} Z`}
            fill="url(#verre)"
            stroke={couleurs.turquoise}
            strokeOpacity={0.5}
            strokeWidth={1.2}
          />
          {fenetres(TOUR_GAUCHE.x, TOUR_GAUCHE.y + 20, TOUR_GAUCHE.l, HORIZON - TOUR_GAUCHE.y - 20, 7, false)}

          {/* Tour de droite, toit en biseau */}
          <Path
            d={`M${TOUR_DROITE.x} ${HORIZON} V${TOUR_DROITE.y + 26} L${TOUR_DROITE.x + TOUR_DROITE.l} ${TOUR_DROITE.y} V${HORIZON} Z`}
            fill="url(#verre)"
            stroke={couleurs.turquoise}
            strokeOpacity={0.5}
            strokeWidth={1.2}
          />
          {fenetres(TOUR_DROITE.x, TOUR_DROITE.y + 30, TOUR_DROITE.l, HORIZON - TOUR_DROITE.y - 30, 19, false)}

          {/* Passerelle lumineuse entre la tour de gauche et la résidence */}
          <Rect x={TOUR_GAUCHE.x + TOUR_GAUCHE.l} y={318} width={128 - TOUR_GAUCHE.x - TOUR_GAUCHE.l} height={7} rx={3.5} fill={couleurs.turquoise} opacity={0.6} />

          {/* Résidence : dalles en quinconce, vitrage turquoise, jardins suspendus */}
          {DALLES.map((d, i) => (
            <G key={i}>
              <Rect x={d.x} y={d.y} width={116} height={38} rx={7} fill={couleurs.navyLogo} stroke={couleurs.surPrimaire} strokeOpacity={0.25} strokeWidth={1} />
              <Rect x={d.x + 8} y={d.y + 9} width={100} height={14} rx={4} fill="url(#bande)" />
              <Rect x={d.x + 6} y={d.y + 30} width={104} height={2} rx={1} fill={couleurs.surPrimaire} opacity={0.35} />
              <Ellipse cx={i % 2 === 0 ? d.x + 8 : d.x + 108} cy={d.y + 4} rx={11} ry={5} fill={couleurs.turquoise} opacity={0.7} />
              <Ellipse cx={i % 2 === 0 ? d.x + 18 : d.x + 98} cy={d.y + 2} rx={6} ry={3.5} fill={couleurs.turquoise} opacity={0.9} />
            </G>
          ))}

          {/* Toit en pignon : la maison, signe de Keyli */}
          <Path
            d={`M140 ${DALLES[7].y - 2} L195 ${DALLES[7].y - 48} L250 ${DALLES[7].y - 2}`}
            fill="none"
            stroke={couleurs.turquoise}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={195} cy={DALLES[7].y - 60} r={3.5} fill={couleurs.surPrimaire} />

          {/* Lagune : reflets */}
          <Rect x={0} y={HORIZON} width={L} height={H - HORIZON} fill={couleurs.navyLogo} />
          <Rect x={128} y={HORIZON + 4} width={134} height={120} fill={couleurs.turquoise} opacity={0.12} />
          {[
            [40, 506, 90],
            [150, 518, 110],
            [280, 510, 80],
            [90, 534, 140],
            [230, 546, 120],
            [170, 570, 70],
          ].map(([x, y, l]) => (
            <Rect key={`${x}-${y}`} x={x} y={y} width={l} height={2} rx={1} fill={couleurs.turquoise} opacity={0.35} />
          ))}
        </Calque>
      </Animated.View>

      {/* Fenêtres qui scintillent */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: Animated.multiply(apparition, scintille) }]}>
        <Calque>
          {fenetres(TOUR_GAUCHE.x, TOUR_GAUCHE.y + 20, TOUR_GAUCHE.l, HORIZON - TOUR_GAUCHE.y - 20, 31, true)}
          {fenetres(TOUR_DROITE.x, TOUR_DROITE.y + 30, TOUR_DROITE.l, HORIZON - TOUR_DROITE.y - 30, 43, true)}
        </Calque>
      </Animated.View>

      {/* Fondu vers le bas : lisibilité du texte et des boutons */}
      <Calque>
        <Defs>
          <LinearGradient id="fondu" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={couleurs.navyLogo} stopOpacity={0} />
            <Stop offset="0.4" stopColor={couleurs.navyLogo} stopOpacity={0.9} />
            <Stop offset="1" stopColor={couleurs.navyLogo} stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id="haut" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={couleurs.navyLogo} stopOpacity={0.85} />
            <Stop offset="1" stopColor={couleurs.navyLogo} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={L} height={150} fill="url(#haut)" />
        <Rect x={0} y={430} width={L} height={H - 430} fill="url(#fondu)" />
      </Calque>
    </Animated.View>
  )
}
