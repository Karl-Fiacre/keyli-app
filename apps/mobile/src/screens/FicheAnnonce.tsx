// Fiche publique d'une annonce — mêmes données que le web (useFicheAnnonce)
// et même enregistrement de la consultation (statistiques de conversion).
// Le contact par la messagerie Keyli arrive sur mobile au sprint suivant :
// d'ici là, le bouton ouvre la fiche sur le site.
import { Dimensions, FlatList, Image, Linking, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFicheAnnonce, useVueAnnonce } from '@/partage/hooks/useRecherche'
import { LIBELLES_TYPE } from '@/partage/lib/validation'
import { formatXof } from '@/partage/lib/format'
import { pluriel } from '@/partage/lib/sejour'
import { urlPhoto } from '@/partage/lib/photos'
import { messageErreur } from '@/partage/lib/erreurs'
import { plateforme } from '@/plateforme'
import { Bouton, Carte, Chargement, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

const LARGEUR = Dimensions.get('window').width

export default function FicheAnnonce({ route }: NativeStackScreenProps<ParamsRacine, 'FicheAnnonce'>) {
  const { id } = route.params
  const fiche = useFicheAnnonce(id)
  useVueAnnonce(fiche.data?.annonce.id, 'search')

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
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => p.id}
          style={styles.galerie}
          renderItem={({ item, index }) => (
            <Image
              source={{ uri: urlPhoto(item.url, 1280, 800) }}
              style={styles.photo}
              accessibilityLabel={`Photo ${index + 1} sur ${photos.length} : ${a.title}`}
            />
          )}
        />
      ) : null}

      <View style={{ gap: espaces.s }}>
        {a.is_verified ? <Text style={styles.verifiee}>Annonce vérifiée par Keyli</Text> : null}
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
          <Texte>
            {annonceur.nom_affiche}
            {annonceur.verified ? ' · identité vérifiée' : ''}
          </Texte>
        </Carte>
      ) : null}

      <Bouton
        libelle="Contacter l'annonceur sur le site"
        onPress={() => void Linking.openURL(plateforme.urlApp(`/annonce/${a.id}`))}
      />
      <Texte attenue>Le contact passe toujours par la messagerie Keyli : le numéro de l'annonceur reste privé.</Texte>
    </Ecran>
  )
}

const styles = StyleSheet.create({
  // La galerie occupe toute la largeur, au-delà des marges de l'écran
  galerie: { marginHorizontal: -espaces.xl, marginTop: -espaces.xl },
  photo: { width: LARGEUR, height: LARGEUR * 0.66, backgroundColor: couleurs.secondaire },
  verifiee: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '700',
    color: couleurs.succesTexte,
    backgroundColor: couleurs.succesFond,
    paddingHorizontal: espaces.m,
    paddingVertical: espaces.xs,
    borderRadius: rayons.pilule,
    overflow: 'hidden',
  },
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
