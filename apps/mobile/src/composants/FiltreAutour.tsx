// Recherche par rayon autour de la position GPS (promesse produit,
// décisions du porteur du 2026-11-14) : rayons 1, 3, 5, 10 km, 5 par défaut ;
// le rayon remplace commune et quartier. La position ne quitte le téléphone
// que pour la recherche (jamais enregistrée) ; la base ne renvoie qu'une
// distance arrondie.
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { FiltresRecherche } from '@/partage/hooks/useRecherche'
import { RAYONS_KM, RAYON_DEFAUT_KM } from '@/partage/lib/recherche'
import { messageErreur } from '@/partage/lib/erreurs'
import { positionActuelle } from '@mobile/services/native/position'
import { Message } from '@mobile/composants/base'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'

export function FiltreAutour({
  filtres,
  onChange,
}: {
  filtres: FiltresRecherche
  onChange: (f: FiltresRecherche) => void
}) {
  const [recherche, setRecherche] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const autour = filtres.autour

  const activer = async () => {
    setErreur(null)
    setRecherche(true)
    try {
      const p = await positionActuelle(
        "Keyli n'a pas accès à votre position. Autorisez la localisation dans les réglages du téléphone pour chercher autour de vous.",
      )
      onChange({ ...filtres, autour: { lat: p.latitude, lng: p.longitude, rayonKm: RAYON_DEFAUT_KM }, page: 1 })
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setRecherche(false)
    }
  }

  return (
    <View style={styles.zone}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ligne}>
        <Pressable
          onPress={() => (autour ? onChange({ ...filtres, autour: undefined, page: 1 }) : void activer())}
          disabled={recherche}
          accessibilityRole="button"
          accessibilityState={{ selected: !!autour, busy: recherche }}
          accessibilityLabel={autour ? 'Désactiver la recherche autour de moi' : 'Rechercher autour de moi'}
          style={({ pressed }) => [styles.puce, autour && styles.puceActive, pressed && { opacity: 0.8 }]}
        >
          {recherche ? (
            <ActivityIndicator size="small" color={couleurs.turquoise} />
          ) : (
            <Ionicons name={autour ? 'locate' : 'locate-outline'} size={17} color={autour ? couleurs.surPrimaire : couleurs.turquoise} />
          )}
          <Text style={[styles.texte, autour && { color: couleurs.surPrimaire }]}>Autour de moi</Text>
          {autour ? <Ionicons name="close" size={16} color={couleurs.surPrimaire} /> : null}
        </Pressable>
        {autour
          ? RAYONS_KM.map((km) => {
              const actif = autour.rayonKm === km
              return (
                <Pressable
                  key={km}
                  onPress={() => onChange({ ...filtres, autour: { ...autour, rayonKm: km }, page: 1 })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: actif }}
                  accessibilityLabel={`Rayon de ${km} kilomètres`}
                  style={[styles.puce, styles.puceRayon, actif && styles.puceRayonActive]}
                >
                  <Text style={[styles.texte, actif && { color: couleurs.surPrimaire }]}>{km} km</Text>
                </Pressable>
              )
            })
          : null}
      </ScrollView>
      {autour && (filtres.commune || filtres.quartier) ? (
        <Text style={styles.note}>Le rayon remplace la commune et le quartier choisis.</Text>
      ) : null}
      {erreur ? <Message>{erreur}</Message> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  zone: { gap: espaces.s, paddingHorizontal: espaces.xl, paddingBottom: espaces.m },
  ligne: { gap: espaces.s, alignItems: 'center' },
  puce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.xs + 2,
    minHeight: 38,
    paddingHorizontal: espaces.m,
    borderRadius: rayons.pilule,
    borderWidth: 1.5,
    borderColor: couleurs.turquoise,
    backgroundColor: couleurs.fond,
  },
  puceActive: { backgroundColor: couleurs.turquoise },
  puceRayon: { borderWidth: 1, borderColor: couleurs.bordure },
  puceRayonActive: { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
  texte: { fontSize: 14, fontWeight: '600', color: couleurs.texte },
  note: { fontSize: 13, color: couleurs.attenue },
})
