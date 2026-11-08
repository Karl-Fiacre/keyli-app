// Carte d'une annonce dans une liste (accueil, recherche) — même résumé que
// le web (ResumeAnnonce, src/partage/lib/annonce.ts).
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import type { ResumeAnnonce } from '@/partage/lib/annonce'
import { LIBELLES_TYPE } from '@/partage/lib/validation'
import { formatXof } from '@/partage/lib/format'
import { couleurs, espaces, ombreCarte, rayons } from '@mobile/theme/tokens'
import { urlPhoto } from '@/partage/lib/photos'

export function CarteAnnonce({ annonce, onPress }: { annonce: ResumeAnnonce; onPress: () => void }) {
  const lieu = [annonce.quartier, annonce.commune ?? annonce.ville].filter(Boolean).join(', ')
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${annonce.titre}, ${formatXof(annonce.prix)}, ${lieu}`}
      style={({ pressed }) => [styles.carte, pressed && { opacity: 0.85 }]}
    >
      {annonce.image ? (
        <Image source={{ uri: urlPhoto(annonce.image, 640, 400) }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.sansPhoto]}>
          <Text style={styles.attenue}>Pas de photo</Text>
        </View>
      )}
      <View style={styles.corps}>
        <View style={styles.ligne}>
          <Text style={styles.type}>{LIBELLES_TYPE[annonce.type as keyof typeof LIBELLES_TYPE] ?? annonce.type}</Text>
          {annonce.verifiee ? <Text style={styles.verifiee}>Vérifiée</Text> : null}
        </View>
        <Text style={styles.titre} numberOfLines={2}>
          {annonce.titre}
        </Text>
        <Text style={styles.attenue} numberOfLines={1}>
          {lieu}
          {annonce.pieces ? ` · ${annonce.pieces} pièce${annonce.pieces > 1 ? 's' : ''}` : ''}
        </Text>
        <Text style={styles.prix}>
          {formatXof(annonce.prix)}
          {annonce.statut === 'a_louer' ? <Text style={styles.attenue}>{annonce.sejour_court ? ' / nuit' : ' / mois'}</Text> : null}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  carte: { backgroundColor: couleurs.fond, borderRadius: rayons.carte, overflow: 'hidden', ...ombreCarte },
  photo: { width: '100%', aspectRatio: 16 / 10, backgroundColor: couleurs.secondaire },
  sansPhoto: { alignItems: 'center', justifyContent: 'center' },
  corps: { padding: espaces.m, gap: espaces.xs },
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  type: { fontSize: 13, fontWeight: '600', color: couleurs.attenue, textTransform: 'uppercase' },
  verifiee: {
    fontSize: 12,
    fontWeight: '700',
    color: couleurs.succesTexte,
    backgroundColor: couleurs.succesFond,
    paddingHorizontal: espaces.s,
    paddingVertical: 2,
    borderRadius: rayons.pilule,
    overflow: 'hidden',
  },
  titre: { fontSize: 17, fontWeight: '600', color: couleurs.texte },
  attenue: { fontSize: 14, color: couleurs.attenue },
  prix: { fontSize: 17, fontWeight: '700', color: couleurs.primaire, marginTop: espaces.xs },
})
