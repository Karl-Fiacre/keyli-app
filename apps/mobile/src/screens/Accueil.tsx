// Accueil — en-tête fixe (logo et accès à la recherche), puis des cartes de
// catégories à la manière de Booking (décision du porteur du 2026-11-21) :
// à l'ouverture ou à la connexion, on choisit ce qu'on cherche au lieu de
// tomber sur le catalogue. Chaque carte ouvre la recherche avec ses filtres
// (src/partage/lib/categories.ts).
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { GROUPES_CATEGORIES, filtresCategorie, type Categorie, type IdCategorie } from '@/partage/lib/categories'
import { Logo, Texte, Titre } from '@mobile/composants/base'
import { couleurs, espaces, ombreCarte, rayons } from '@mobile/theme/tokens'
import type { ParamsOnglets } from '@mobile/navigation/types'

const ICONES: Record<IdCategorie, keyof typeof Ionicons.glyphMap> = {
  sejours: 'calendar-outline',
  hotels: 'bed-outline',
  auberges: 'cafe-outline',
  residences: 'key-outline',
  location: 'home-outline',
  achat: 'pricetag-outline',
  bureaux: 'briefcase-outline',
  magasins: 'storefront-outline',
}

type Props = BottomTabScreenProps<ParamsOnglets, 'Accueil'>

export default function Accueil({ navigation }: Props) {
  const ouvrir = (c: Categorie) => navigation.navigate('Recherche', { filtres: filtresCategorie(c) })

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <View style={styles.entete}>
        <Logo largeur={104} />
        <Pressable
          onPress={() => navigation.navigate('Recherche')}
          accessibilityRole="button"
          accessibilityLabel="Rechercher un logement"
          style={({ pressed }) => [styles.recherche, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="search" size={17} color={couleurs.surPrimaire} />
          <Text style={styles.texteRecherche}>Rechercher</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.presentation}>
          <Titre>Que cherchez-vous ?</Titre>
          <Texte attenue>Séjours, logements et locaux vérifiés en Côte d’Ivoire.</Texte>
        </View>
        {GROUPES_CATEGORIES.map((g) => (
          <View key={g.titre} style={styles.groupe}>
            <Text style={styles.titreGroupe} accessibilityRole="header">
              {g.titre}
            </Text>
            <View style={styles.grille}>
              {g.categories.map((c) => (
                <CarteCategorie key={c.id} categorie={c} onPress={() => ouvrir(c)} />
              ))}
            </View>
          </View>
        ))}
        <Pressable
          // Remet les filtres à zéro, même si une catégorie a été ouverte avant
          onPress={() => navigation.navigate('Recherche', { filtres: { avantages: [], tri: 'pertinence', page: 1 } })}
          accessibilityRole="link"
          style={({ pressed }) => [styles.toutVoir, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.texteToutVoir}>Voir toutes les annonces</Text>
          <Ionicons name="arrow-forward" size={16} color={couleurs.bleuLogo} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function CarteCategorie({ categorie, onPress }: { categorie: Categorie; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${categorie.libelle} : ${categorie.description}`}
      style={({ pressed }) => [styles.carte, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.pastille}>
        <Ionicons name={ICONES[categorie.id]} size={22} color={couleurs.turquoise} />
      </View>
      <Text style={styles.libelle} numberOfLines={2}>
        {categorie.libelle}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {categorie.description}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaces.m,
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.s + 2,
    backgroundColor: couleurs.fond,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  recherche: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.xs + 2,
    minHeight: 40,
    paddingHorizontal: espaces.m + 2,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.primaire,
  },
  texteRecherche: { fontSize: 14, fontWeight: '600', color: couleurs.surPrimaire },
  contenu: { padding: espaces.l, paddingBottom: espaces.xxl, gap: espaces.xl },
  presentation: { gap: espaces.s },
  groupe: { gap: espaces.m },
  titreGroupe: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: couleurs.attenue },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.m },
  carte: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 124,
    padding: espaces.m + 2,
    gap: espaces.xs,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
    ...ombreCarte,
  },
  pastille: {
    width: 40,
    height: 40,
    marginBottom: espaces.xs,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.turquoiseFond,
  },
  libelle: { fontSize: 16, fontWeight: '700', color: couleurs.texte },
  description: { fontSize: 13, color: couleurs.attenue },
  toutVoir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espaces.xs, padding: espaces.m },
  texteToutVoir: { fontSize: 15, fontWeight: '600', color: couleurs.bleuLogo },
})
