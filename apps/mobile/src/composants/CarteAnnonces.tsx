// Vue carte de la recherche (react-native-maps, inclus dans Expo Go) — même
// principe que le web (CarteCatalogue) : une pastille de prix par annonce, à
// une position APPROXIMATIVE calculée par la base (usePositionsAnnonces).
// La position exacte n'est jamais lisible par le client.
// Vue rapprochée (quartier) : chaque pastille devient un aperçu photo du
// logement, avec son prix (décision du porteur, 2026-11-13).
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'
import MapView, { Circle, Marker, type Region } from 'react-native-maps'
import Ionicons from '@expo/vector-icons/Ionicons'
import { usePositionsAnnonces } from '@/partage/hooks/useRecherche'
import type { ResumeAnnonce } from '@/partage/lib/annonce'
import { formatPrixCourt } from '@/partage/lib/format'
import { urlPhoto } from '@/partage/lib/photos'
import { CarteAnnonce } from '@mobile/composants/CarteAnnonce'
import { couleurs, espaces, ombreCarte, rayons } from '@mobile/theme/tokens'

const ABIDJAN = { latitude: 5.36, longitude: -4.0083, latitudeDelta: 0.25, longitudeDelta: 0.25 }
// En dessous de cette hauteur de carte (en degrés, environ 9 km : l'échelle
// d'une commune), les annonces s'affichent en aperçu photo
const ZOOM_APERCU = 0.08

// Marqueur d'une annonce : pastille de prix de loin, aperçu photo de près.
// Sur Android, une vue de marqueur est figée en image : on la laisse se
// redessiner le temps que la photo arrive, puis on la fige (performances).
function MarqueurAnnonce({ annonce: a, apercu }: { annonce: ResumeAnnonce; apercu: boolean }) {
  const photo = apercu ? urlPhoto(a.image, 160, 112) : undefined
  if (!photo) {
    return (
      <View style={[styles.pastille, a.verifiee ? styles.pastilleVerifiee : null]}>
        <Text style={[styles.prix, a.verifiee ? styles.prixVerifie : null]}>{formatPrixCourt(a.prix)}</Text>
      </View>
    )
  }
  return (
    <View style={styles.apercuPhoto}>
      <Image source={{ uri: photo }} style={styles.vignette} />
      <View style={[styles.prixApercu, a.verifiee ? styles.pastilleVerifiee : null]}>
        <Text style={[styles.prix, a.verifiee ? styles.prixVerifie : null]} numberOfLines={1}>
          {formatPrixCourt(a.prix)}
        </Text>
      </View>
      <View style={styles.pointe} />
    </View>
  )
}

// Le marqueur suit les changements de sa vue pendant 1,5 s (chargement de la
// photo), puis se fige
function useSuiviTemporaire(cle: string) {
  const [suivi, setSuivi] = useState(true)
  useEffect(() => {
    setSuivi(true)
    const minuteur = setTimeout(() => setSuivi(false), 1500)
    return () => clearTimeout(minuteur)
  }, [cle])
  return suivi
}

function Repere({
  annonce,
  coordonnees,
  apercu,
  onChoisir,
}: {
  annonce: ResumeAnnonce
  coordonnees: { latitude: number; longitude: number }
  apercu: boolean
  onChoisir: (id: string) => void
}) {
  const suivi = useSuiviTemporaire(apercu ? 'apercu' : 'prix')
  return (
    <Marker
      coordinate={coordonnees}
      title={annonce.titre}
      anchor={{ x: 0.5, y: apercu ? 1 : 0.5 }}
      tracksViewChanges={suivi}
      onPress={(e) => {
        e.stopPropagation()
        onChoisir(annonce.id)
      }}
    >
      <MarqueurAnnonce annonce={annonce} apercu={apercu} />
    </Marker>
  )
}

export function CarteAnnonces({
  annonces,
  onOuvrir,
  autour,
}: {
  annonces: ResumeAnnonce[]
  onOuvrir: (id: string) => void
  // Recherche par rayon : cercle de recherche autour de l'utilisateur
  autour?: { lat: number; lng: number; rayonKm: number }
}) {
  const carte = useRef<MapView>(null)
  const [choisie, setChoisie] = useState<string | null>(null)
  const [hauteur, setHauteur] = useState(ABIDJAN.latitudeDelta)
  const apercu = hauteur <= ZOOM_APERCU
  const positions = usePositionsAnnonces(
    annonces.map((a) => a.id),
    true,
  )
  const placees = annonces.flatMap((a) => {
    const p = positions.data?.get(a.id)
    return p ? [{ annonce: a, coordonnees: { latitude: p.lat, longitude: p.lng } }] : []
  })
  const annonceChoisie = annonces.find((a) => a.id === choisie)

  // Recherche par rayon : cadrage sur le cercle de recherche
  useEffect(() => {
    if (!autour) return
    const marge = (autour.rayonKm / 111) * 1.15 // degrés de latitude, un peu de marge
    carte.current?.animateToRegion(
      { latitude: autour.lat, longitude: autour.lng, latitudeDelta: marge * 2, longitudeDelta: marge * 2 },
      400,
    )
  }, [autour])

  // Cadrage sur les annonces de la page affichée (sans rayon)
  useEffect(() => {
    if (autour || placees.length === 0) return
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
        onRegionChangeComplete={(r: Region) => setHauteur(r.latitudeDelta)}
        showsUserLocation={!!autour}
      >
        {autour ? (
          <Circle
            center={{ latitude: autour.lat, longitude: autour.lng }}
            radius={autour.rayonKm * 1000}
            strokeColor={couleurs.turquoise}
            strokeWidth={2}
            fillColor={couleurs.turquoiseFond + '66'}
          />
        ) : null}
        {placees.map(({ annonce: a, coordonnees }) => (
          <Repere key={a.id} annonce={a} coordonnees={coordonnees} apercu={apercu} onChoisir={setChoisie} />
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
  // Aperçu photo (vue rapprochée)
  apercuPhoto: { alignItems: 'center' },
  vignette: {
    width: 80,
    height: 56,
    borderRadius: rayons.champ / 1.5,
    borderWidth: 2,
    borderColor: couleurs.fond,
    backgroundColor: couleurs.secondaire,
  },
  prixApercu: {
    marginTop: -espaces.s,
    paddingHorizontal: espaces.s,
    paddingVertical: 2,
    borderRadius: rayons.pilule,
    borderWidth: 1.5,
    borderColor: couleurs.primaire,
    backgroundColor: couleurs.fond,
  },
  pointe: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: couleurs.primaire,
  },
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
