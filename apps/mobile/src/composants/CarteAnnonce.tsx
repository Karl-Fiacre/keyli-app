// Carte d'une annonce dans une liste (accueil, recherche, favoris, annonces
// similaires) — même résumé que le web (ResumeAnnonce,
// src/partage/lib/annonce.ts). Version compacte : aperçu sur la carte.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { ResumeAnnonce } from '@/partage/lib/annonce'
import { LIBELLES_TYPE } from '@/partage/lib/validation'
import { formatXof } from '@/partage/lib/format'
import { urlPhoto } from '@/partage/lib/photos'
import { libelleDistance } from '@/partage/lib/recherche'
import { BadgeVerifie } from '@mobile/composants/BadgeVerifie'
import { BoutonFavori } from '@mobile/composants/BoutonFavori'
import { couleurs, espaces, ombreCarte, rayons } from '@mobile/theme/tokens'

export function CarteAnnonce({
  annonce,
  onPress,
  compacte = false,
}: {
  annonce: ResumeAnnonce
  onPress: () => void
  compacte?: boolean
}) {
  const lieu = [annonce.quartier, annonce.commune ?? annonce.ville].filter(Boolean).join(', ')
  // Recherche par rayon : distance arrondie, jamais la position exacte
  const distance = libelleDistance(annonce.distance_km)
  const photo = annonce.image ? (
    <Image
      source={{ uri: urlPhoto(annonce.image, compacte ? 240 : 640, compacte ? 240 : 400) }}
      style={compacte ? styles.vignette : styles.photo}
    />
  ) : (
    <View style={[compacte ? styles.vignette : styles.photo, styles.sansPhoto]}>
      <Text style={styles.attenue}>Pas de photo</Text>
    </View>
  )

  return (
    <View style={[styles.carte, compacte && styles.carteCompacte]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${annonce.titre}, ${formatXof(annonce.prix)}, ${lieu}${annonce.verifiee ? ', vérifiée par Keyli' : ''}`}
        style={({ pressed }) => [compacte && styles.ligneCompacte, pressed && { opacity: 0.85 }]}
      >
        {photo}
        <View style={[styles.corps, compacte && styles.corpsCompact]}>
          <View style={styles.ligne}>
            <Text style={styles.type}>
              {LIBELLES_TYPE[annonce.type as keyof typeof LIBELLES_TYPE] ?? annonce.type}
            </Text>
            {annonce.verifiee ? (
              <View style={styles.verifiee}>
                <BadgeVerifie taille={14} />
                <Text style={styles.texteVerifiee}>Vérifiée</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.titre} numberOfLines={compacte ? 1 : 2}>
            {annonce.titre}
          </Text>
          {distance ? (
            <View style={styles.distance}>
              <Ionicons name="navigate-outline" size={13} color={couleurs.turquoise} />
              <Text style={styles.texteDistance}>{distance}</Text>
            </View>
          ) : null}
          <Text style={styles.attenue} numberOfLines={1}>
            {lieu}
            {annonce.pieces ? ` · ${annonce.pieces} pièce${annonce.pieces > 1 ? 's' : ''}` : ''}
          </Text>
          <Text style={styles.prix}>
            {formatXof(annonce.prix)}
            {annonce.statut === 'a_louer' ? (
              <Text style={styles.attenue}>{annonce.sejour_court ? ' / nuit' : ' / mois'}</Text>
            ) : null}
          </Text>
        </View>
      </Pressable>
      {compacte ? null : (
        <View style={styles.favori}>
          <BoutonFavori propertyId={annonce.id} titre={annonce.titre} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  carte: { backgroundColor: couleurs.fond, borderRadius: rayons.carte, overflow: 'hidden', ...ombreCarte },
  carteCompacte: { overflow: 'visible' },
  ligneCompacte: { flexDirection: 'row' },
  photo: { width: '100%', aspectRatio: 16 / 10, backgroundColor: couleurs.secondaire },
  vignette: {
    width: 104,
    height: 104,
    backgroundColor: couleurs.secondaire,
    borderTopLeftRadius: rayons.carte,
    borderBottomLeftRadius: rayons.carte,
  },
  sansPhoto: { alignItems: 'center', justifyContent: 'center' },
  corps: { padding: espaces.m, gap: espaces.xs },
  corpsCompact: { flex: 1, paddingVertical: espaces.s },
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  type: { fontSize: 13, fontWeight: '600', color: couleurs.attenue, textTransform: 'uppercase' },
  verifiee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: couleurs.succesFond,
    paddingLeft: 3,
    paddingRight: espaces.s,
    paddingVertical: 2,
    borderRadius: rayons.pilule,
  },
  texteVerifiee: { fontSize: 12, fontWeight: '700', color: couleurs.succesTexte },
  titre: { fontSize: 17, fontWeight: '600', color: couleurs.texte },
  attenue: { fontSize: 14, color: couleurs.attenue },
  prix: { fontSize: 17, fontWeight: '700', color: couleurs.primaire, marginTop: espaces.xs },
  favori: { position: 'absolute', top: espaces.s, right: espaces.s },
  distance: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  texteDistance: { fontSize: 13, fontWeight: '600', color: couleurs.turquoise },
})
