// Fiche publique d'une annonce — mêmes données que le web (useFicheAnnonce)
// et même enregistrement de la consultation (statistiques de conversion).
// Sprint 14 : galerie plein écran, badge officiel, favori, partage et
// annonces similaires. Contact de l'annonceur par la messagerie Keyli,
// directement dans l'application (2026-11-13).
import { useState } from 'react'
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFicheAnnonce, useVueAnnonce } from '@/partage/hooks/useRecherche'
import { useAnnoncesSimilaires } from '@/partage/hooks/useConversion'
import { LIBELLES_TYPE } from '@/partage/lib/validation'
import { formatXof } from '@/partage/lib/format'
import { pluriel } from '@/partage/lib/sejour'
import { urlPhoto } from '@/partage/lib/photos'
import { messageErreur } from '@/partage/lib/erreurs'
import { plateforme } from '@/plateforme'
import { Carte, Chargement, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { BadgeVerifie } from '@mobile/composants/BadgeVerifie'
import { BoutonFavori } from '@mobile/composants/BoutonFavori'
import { ContactAnnonceur } from '@mobile/composants/ContactAnnonceur'
import { CarteAnnonce } from '@mobile/composants/CarteAnnonce'
import { GaleriePleinEcran } from '@mobile/composants/GaleriePleinEcran'
import { couleurs, espaces, ombreCarte, rayons } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

// Partage : feuille de partage du téléphone. Le lien porte la source
// « lien_direct », comme sur le web, pour mesurer les visites venues d'un partage.
function partager(id: string, titre: string) {
  const lien = plateforme.urlApp(`/annonce/${id}?source=lien_direct`)
  const texte = `${titre} — sur Keyli`
  // Android n'utilise que « message » ; iOS affiche le lien à part
  Share.share(Platform.OS === 'ios' ? { message: texte, url: lien } : { message: `${texte} ${lien}` }).catch(
    () => undefined, // partage annulé ou impossible : rien à faire
  )
}

export default function FicheAnnonce({ route, navigation }: NativeStackScreenProps<ParamsRacine, 'FicheAnnonce'>) {
  const { id, source } = route.params
  const { width } = useWindowDimensions()
  const fiche = useFicheAnnonce(id)
  const similaires = useAnnoncesSimilaires(id)
  const [galerie, setGalerie] = useState<number | null>(null)
  const [photoVisible, setPhotoVisible] = useState(0)
  useVueAnnonce(fiche.data?.annonce.id, source ?? 'search')

  if (fiche.isPending) return <Chargement />
  if (fiche.isError || !fiche.data) {
    return (
      <Ecran centre>
        <Message>{fiche.isError ? messageErreur(fiche.error) : "Cette annonce n'est plus disponible."}</Message>
      </Ecran>
    )
  }

  const { annonce: a, annonceur } = fiche.data
  const photos = a.property_media_keyli
    .filter((m) => m.media_type === 'image')
    .sort((x, y) => (x.order_index ?? 0) - (y.order_index ?? 0))
  const avantages = a.property_avantages_keyli
    .map((pa) => pa.avantages_keyli)
    .filter((v): v is NonNullable<typeof v> => !!v)
    .sort((x, y) => x.ordre - y.ordre)
  const lieu = [a.quartiers_keyli?.nom, a.quartiers_keyli?.communes_keyli?.nom ?? a.city].filter(Boolean).join(', ')
  const caracteristiques = [
    LIBELLES_TYPE[a.type],
    a.area_m2 !== null ? `${a.area_m2} m²` : null,
    a.rooms !== null ? `${a.rooms} pièce${a.rooms > 1 ? 's' : ''}` : null,
    a.bathrooms !== null ? `${a.bathrooms} salle${a.bathrooms > 1 ? 's' : ''} de bain` : null,
    a.furnished ? 'Meublé' : null,
  ].filter((c): c is string => !!c)

  return (
    <Ecran>
      {photos.length > 0 ? (
        <View style={styles.galerie}>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(p) => p.id}
            onMomentumScrollEnd={(e) => setPhotoVisible(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => setGalerie(index)}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Photo ${index + 1} sur ${photos.length} : ${a.title}. Ouvrir en plein écran`}
              >
                <Image
                  source={{ uri: urlPhoto(item.url, 1280, 800) }}
                  style={{ width, height: width * 0.66, backgroundColor: couleurs.secondaire }}
                />
              </Pressable>
            )}
          />
          {photos.length > 1 ? (
            <Text style={styles.compteur}>
              {photoVisible + 1} / {photos.length}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: espaces.s }}>
        <View style={styles.ligneHaut}>
          {a.is_verified ? (
            <View style={styles.verifiee}>
              <BadgeVerifie taille={20} />
              <Text style={styles.texteVerifiee}>Annonce vérifiée par Keyli</Text>
            </View>
          ) : (
            <View />
          )}
          <View style={styles.actions}>
            <Pressable
              onPress={() => partager(a.id, a.title)}
              accessibilityRole="button"
              accessibilityLabel="Partager l'annonce"
              hitSlop={8}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="share-social-outline" size={21} color={couleurs.texte} />
            </Pressable>
            <BoutonFavori propertyId={a.id} titre={a.title} />
          </View>
        </View>
        <Titre>{a.title}</Titre>
        <Texte attenue>{lieu}</Texte>
        <Text style={styles.prix}>
          {formatXof(Number(a.price))}
          {a.status === 'a_louer' ? (
            <Text style={styles.unite}>{a.sejour_court ? ' / nuit' : ' / mois'}</Text>
          ) : null}
        </Text>
        {a.sejour_court && a.nuits_min > 1 ? <Texte attenue>{pluriel(a.nuits_min, 'nuit')} minimum</Texte> : null}
      </View>

      <View style={styles.pastilles}>
        {caracteristiques.map((c) => (
          <Text key={c} style={styles.pastille}>
            {c}
          </Text>
        ))}
      </View>

      {a.description ? <Texte>{a.description}</Texte> : null}

      {avantages.length > 0 ? (
        <View style={{ gap: espaces.s }}>
          <Text style={styles.sousTitre}>Avantages</Text>
          <View style={styles.pastilles}>
            {avantages.map((v) => (
              <Text key={v.id} style={styles.pastille}>
                {v.libelle}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {annonceur ? (
        <Carte style={{ gap: espaces.xs }}>
          <Text style={styles.sousTitre}>Annonceur</Text>
          <View style={styles.annonceur}>
            <Texte>{annonceur.nom_affiche}</Texte>
            {annonceur.verified ? (
              <>
                <BadgeVerifie taille={18} libelle="Identité vérifiée par Keyli" />
                <Texte attenue>identité vérifiée</Texte>
              </>
            ) : null}
          </View>
        </Carte>
      ) : null}

      <ContactAnnonceur
        propertyId={a.id}
        destinataire={a.owner_id}
        nomDestinataire={annonceur?.nom_affiche ?? undefined}
        titreAnnonce={a.title}
      />

      {similaires.data?.length ? (
        <View style={{ gap: espaces.m }}>
          <Text style={styles.sousTitre}>Ces biens peuvent aussi vous intéresser</Text>
          <FlatList
            data={similaires.data}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(s) => s.id}
            style={styles.similaires}
            contentContainerStyle={styles.similairesContenu}
            renderItem={({ item }) => (
              <View style={{ width: Math.min(300, width * 0.78) }}>
                <CarteAnnonce
                  annonce={item}
                  onPress={() => navigation.push('FicheAnnonce', { id: item.id, source: 'recommandation' })}
                />
              </View>
            )}
          />
        </View>
      ) : null}

      <GaleriePleinEcran photos={photos} titre={a.title} depart={galerie} onFermer={() => setGalerie(null)} />
    </Ecran>
  )
}

const styles = StyleSheet.create({
  // La galerie occupe toute la largeur, au-delà des marges de l'écran
  galerie: { marginHorizontal: -espaces.xl, marginTop: -espaces.xl },
  compteur: {
    position: 'absolute',
    right: espaces.m,
    bottom: espaces.m,
    color: couleurs.surPrimaire,
    backgroundColor: couleurs.navyLogo,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: espaces.s,
    paddingVertical: 2,
    borderRadius: rayons.pilule,
    overflow: 'hidden',
  },
  ligneHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaces.s },
  verifiee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.xs,
    backgroundColor: couleurs.succesFond,
    paddingLeft: espaces.xs,
    paddingRight: espaces.m,
    paddingVertical: espaces.xs,
    borderRadius: rayons.pilule,
  },
  texteVerifiee: { fontSize: 13, fontWeight: '700', color: couleurs.succesTexte },
  actions: { flexDirection: 'row', gap: espaces.s },
  action: {
    width: 40,
    height: 40,
    borderRadius: rayons.pilule,
    backgroundColor: couleurs.fond,
    alignItems: 'center',
    justifyContent: 'center',
    ...ombreCarte,
  },
  annonceur: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: espaces.xs },
  // Les annonces similaires défilent jusqu'au bord de l'écran
  similaires: { marginHorizontal: -espaces.xl },
  similairesContenu: { paddingHorizontal: espaces.xl, paddingBottom: espaces.m, gap: espaces.l },
  prix: { fontSize: 22, fontWeight: '700', color: couleurs.primaire },
  unite: { fontSize: 16, fontWeight: '400', color: couleurs.attenue },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.s },
  pastille: {
    fontSize: 14,
    color: couleurs.texte,
    backgroundColor: couleurs.secondaire,
    paddingHorizontal: espaces.m,
    paddingVertical: espaces.xs + 2,
    borderRadius: rayons.pilule,
    overflow: 'hidden',
  },
  sousTitre: { fontSize: 16, fontWeight: '700', color: couleurs.texte },
})
