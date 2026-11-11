// Photos d'une annonce en cours de publication (Sprint 15) : prise de vue
// avec la caméra ou choix dans la galerie, 1 à 10 photos. La première est
// la photo principale ; « ← » avance une photo d'un rang, « × » la retire.
// Les photos ne partent vers Cloudinary qu'au moment de publier.
import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { MAX_PHOTOS } from '@/partage/lib/photos'
import { messageErreur } from '@/partage/lib/erreurs'
import { choisirPhotos, prendrePhoto, type PhotoLocale } from '@mobile/services/native/photos'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'

export function GrillePhotos({
  photos,
  onChange,
  occupe,
  progression,
  erreur,
}: {
  photos: PhotoLocale[]
  onChange: (photos: PhotoLocale[]) => void
  occupe: boolean
  // Avancement de l'envoi (0 à 1) pendant la publication
  progression: number | null
  erreur?: string
}) {
  const [probleme, setProbleme] = useState<string>()
  const restant = MAX_PHOTOS - photos.length

  const ajouter = async (source: 'camera' | 'galerie') => {
    setProbleme(undefined)
    try {
      const nouvelles = source === 'camera' ? [await prendrePhoto()].flatMap((p) => (p ? [p] : [])) : await choisirPhotos(restant)
      if (nouvelles.length > 0) onChange([...photos, ...nouvelles].slice(0, MAX_PHOTOS))
    } catch (e) {
      setProbleme(messageErreur(e))
    }
  }

  const avancer = (i: number) => {
    if (i <= 0) return
    const copie = [...photos]
    ;[copie[i - 1], copie[i]] = [copie[i], copie[i - 1]]
    onChange(copie)
  }

  return (
    <View style={styles.groupe}>
      <Text style={styles.libelle}>
        Photos du bien ({photos.length} / {MAX_PHOTOS})
      </Text>
      <Text style={styles.aide}>Au moins une photo. La première est la photo principale de l'annonce.</Text>

      {photos.length > 0 ? (
        <View style={styles.grille}>
          {photos.map((p, i) => (
            <View key={p.cle} style={styles.vignette}>
              <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
              {i === 0 ? (
                <View style={styles.principale}>
                  <Text style={styles.texteprincipale}>Principale</Text>
                </View>
              ) : null}
              {!occupe ? (
                <View style={styles.actions}>
                  {i > 0 ? (
                    <Pressable
                      onPress={() => avancer(i)}
                      accessibilityRole="button"
                      accessibilityLabel={`Avancer la photo ${i + 1}`}
                      hitSlop={6}
                      style={styles.action}
                    >
                      <Ionicons name="arrow-back" size={16} color={couleurs.surPrimaire} />
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => onChange(photos.filter((x) => x.cle !== p.cle))}
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer la photo ${i + 1}`}
                    hitSlop={6}
                    style={styles.action}
                  >
                    <Ionicons name="close" size={16} color={couleurs.surPrimaire} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {restant > 0 && !occupe ? (
        <View style={styles.boutons}>
          <Pressable onPress={() => void ajouter('camera')} accessibilityRole="button" style={styles.ajout}>
            <Ionicons name="camera-outline" size={22} color={couleurs.primaire} />
            <Text style={styles.texteAjout}>Prendre une photo</Text>
          </Pressable>
          <Pressable onPress={() => void ajouter('galerie')} accessibilityRole="button" style={styles.ajout}>
            <Ionicons name="images-outline" size={22} color={couleurs.primaire} />
            <Text style={styles.texteAjout}>Galerie</Text>
          </Pressable>
        </View>
      ) : null}

      {progression !== null ? (
        <View style={styles.barre} accessibilityRole="progressbar" accessibilityValue={{ now: Math.round(progression * 100), min: 0, max: 100 }}>
          <View style={[styles.remplissage, { width: `${Math.round(progression * 100)}%` }]} />
        </View>
      ) : null}
      {probleme || erreur ? <Text style={styles.erreur}>{probleme ?? erreur}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  groupe: { gap: espaces.s },
  libelle: { fontSize: 14, fontWeight: '600', color: couleurs.texte },
  aide: { fontSize: 13, color: couleurs.attenue },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.s },
  vignette: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: rayons.champ,
    overflow: 'hidden',
    backgroundColor: couleurs.secondaire,
  },
  principale: {
    position: 'absolute',
    left: espaces.xs,
    bottom: espaces.xs,
    backgroundColor: couleurs.turquoise,
    borderRadius: rayons.pilule,
    paddingHorizontal: espaces.s,
    paddingVertical: 2,
  },
  texteprincipale: { fontSize: 11, fontWeight: '700', color: couleurs.surPrimaire },
  actions: { position: 'absolute', top: espaces.xs, right: espaces.xs, flexDirection: 'row', gap: espaces.xs },
  action: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.primaire,
    opacity: 0.85,
  },
  boutons: { flexDirection: 'row', gap: espaces.s },
  ajout: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaces.xs,
    paddingVertical: espaces.l,
    borderRadius: rayons.champ,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: couleurs.attenue,
    backgroundColor: couleurs.secondaire,
  },
  texteAjout: { fontSize: 14, fontWeight: '600', color: couleurs.primaire },
  barre: { height: 6, borderRadius: 3, backgroundColor: couleurs.bordure, overflow: 'hidden' },
  remplissage: { height: '100%', backgroundColor: couleurs.turquoise },
  erreur: { fontSize: 13, color: couleurs.erreurTexte },
})
