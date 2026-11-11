// Emplacement exact du bien à la publication (Sprint 15) — même principe
// que le web (SelecteurPointGps) : toucher la carte ou glisser le repère, ou
// utiliser la position du téléphone. Cette position exacte n'est jamais
// montrée aux visiteurs : la base n'expose qu'une position approximative.
import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { messageErreur } from '@/partage/lib/erreurs'
import { Bouton } from '@mobile/composants/base'
import { positionActuelle, type Point } from '@mobile/services/native/position'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'

const ABIDJAN = { latitude: 5.36, longitude: -4.0083, latitudeDelta: 0.2, longitudeDelta: 0.2 }

export function SelecteurPosition({
  valeur,
  onChange,
  erreur,
}: {
  valeur: Point | null
  onChange: (p: Point) => void
  erreur?: string
}) {
  const carte = useRef<MapView>(null)
  const [recherche, setRecherche] = useState(false)
  const [probleme, setProbleme] = useState<string>()

  const maPosition = async () => {
    setRecherche(true)
    setProbleme(undefined)
    try {
      const p = await positionActuelle()
      onChange(p)
      carte.current?.animateToRegion({ ...p, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600)
    } catch (e) {
      setProbleme(messageErreur(e))
    } finally {
      setRecherche(false)
    }
  }

  return (
    <View style={styles.groupe}>
      <Text style={styles.libelle}>Emplacement exact du bien</Text>
      <Text style={styles.aide}>Touchez la carte pour placer le repère, ou utilisez votre position sur place.</Text>
      <View style={[styles.cadre, erreur ? styles.cadreErreur : null]}>
        <MapView
          ref={carte}
          style={StyleSheet.absoluteFill}
          initialRegion={valeur ? { ...valeur, latitudeDelta: 0.01, longitudeDelta: 0.01 } : ABIDJAN}
          toolbarEnabled={false}
          onPress={(e) => onChange(e.nativeEvent.coordinate)}
        >
          {valeur ? (
            <Marker
              coordinate={valeur}
              draggable
              pinColor={couleurs.turquoise}
              onDragEnd={(e) => onChange(e.nativeEvent.coordinate)}
            />
          ) : null}
        </MapView>
      </View>
      <Bouton libelle="Utiliser ma position" variante="secondaire" onPress={maPosition} chargement={recherche} />
      {valeur ? <Text style={styles.aide}>Repère placé. Vous pouvez le déplacer en le faisant glisser.</Text> : null}
      {probleme || erreur ? <Text style={styles.erreur}>{probleme ?? erreur}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  groupe: { gap: espaces.s },
  libelle: { fontSize: 14, fontWeight: '600', color: couleurs.texte },
  aide: { fontSize: 13, color: couleurs.attenue },
  cadre: {
    height: 240,
    borderRadius: rayons.carte,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  cadreErreur: { borderColor: couleurs.erreur },
  erreur: { fontSize: 13, color: couleurs.erreurTexte },
})
