// Vue carte de la recherche (react-native-maps, inclus dans Expo Go) — même
// principe que le web (CarteCatalogue) : une pastille de prix par annonce, à
// une position APPROXIMATIVE calculée par la base (usePositionsAnnonces).
// La position exacte n'est jamais lisible par le client.
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import Ionicons from '@expo/vector-icons/Ionicons'
import { usePositionsAnnonces } from '@/partage/hooks/useRecherche'
import type { ResumeAnnonce } from '@/partage/lib/annonce'
import { formatPrixCourt } from '@/partage/lib/format'
import { CarteAnnonce } from '@mobile/composants/CarteAnnonce'
import { couleurs, espaces, ombreCarte, rayons } from '@mobile/theme/tokens'

const ABIDJAN = { latitude: 5.36, longitude: -4.0083, latitudeDelta: 0.25, longitudeDelta: 0.25 }

export function CarteAnnonces({
  annonces,
  onOuvrir,
}: {
  annonces: ResumeAnnonce[]
  onOuvrir: (id: string) => void
}) {
  const carte = useRef<MapView>(null)
  const [choisie, setChoisie] = useState<string | null>(null)
  const positions = usePositionsAnnonces(
    annonces.map((a) => a.id),
    true,
  )
  const placees = annonces.flatMap((a) => {
    const p = positions.data?.get(a.id)
    return p ? [{ annonce: a, coordonnees: { latitude: p.lat, longitude: p.lng } }] : []
  })
  const annonceChoisie = annonces.find((a) => a.id === choisie)

  // Cadrage sur les annonces de la page affichée
  useEffect(() => {
    if (placees.length === 0) return
    carte.current?.fitToCoordinates(
      placees.map((p) => p.coordonnees),
      { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true },
    )
  }, [positions.data])

  return (
    <View style={styles.zone}>
      <MapView
        ref={carte}
        style={StyleSheet.absoluteFill}
        initialRegion={ABIDJAN}
        maxZoomLevel={16} // au-delà, la position approximative n'a plus de sens
        toolbarEnabled={false}
        onPress={() => setChoisie(null)}
      >
        {placees.map(({ annonce: a, coordonnees }) => (
          <Marker
            key={a.id}
            coordinate={coordonnees}
            title={a.titre}
            onPress={(e) => {
              e.stopPropagation()
              setChoisie(a.id)
            }}
          >
            <View style={[styles.pastille, a.verifiee ? styles.pastilleVerifiee : null]}>
              <Text style={[styles.prix, a.verifiee ? styles.prixVerifie : null]}>{formatPrixCourt(a.prix)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {positions.isFetching ? (
        <ActivityIndicator style={styles.chargement} color={couleurs.primaire} />
      ) : null}

      <View style={styles.avertissement}>
        <Ionicons name="information-circle-outline" size={16} color={couleurs.attenue} />
        <Text style={styles.texteAvertissement}>
          Positions approximatives : l'adresse exacte est donnée par l'annonceur.
        </Text>
      </View>

      {annonceChoisie ? (
        <View style={styles.apercu}>
          <CarteAnnonce annonce={annonceChoisie} onPress={() => onOuvrir(annonceChoisie.id)} compacte />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  zone: { flex: 1, backgroundColor: couleurs.secondaire },
  pastille: {
    paddingHorizontal: espaces.s + 2,
    paddingVertical: espaces.xs,
    borderRadius: rayons.pilule,
    borderWidth: 2,
    borderColor: couleurs.primaire,
    backgroundColor: couleurs.fond,
  },
  pastilleVerifiee: { backgroundColor: couleurs.primaire, borderColor: couleurs.fond },
  prix: { fontSize: 12, fontWeight: '700', color: couleurs.primaire },
  prixVerifie: { color: couleurs.surPrimaire },
  chargement: { position: 'absolute', top: espaces.m, alignSelf: 'center' },
  avertissement: {
    position: 'absolute',
    top: espaces.m,
    left: espaces.m,
    right: espaces.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.xs,
    padding: espaces.s,
    borderRadius: rayons.champ,
    backgroundColor: couleurs.fond,
    ...ombreCarte,
  },
  texteAvertissement: { flex: 1, fontSize: 12, color: couleurs.attenue },
  apercu: { position: 'absolute', left: espaces.m, right: espaces.m, bottom: espaces.m },
})
