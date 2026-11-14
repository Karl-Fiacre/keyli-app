// Messages — liste des conversations du compte (une par bien et
// interlocuteur), comme la messagerie du web : mêmes données
// (useConversations), tout se passe dans l'application (2026-11-13).
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSession } from '@/partage/hooks/useSession'
import { useConversations } from '@/partage/hooks/useMessagerie'
import { messageErreur } from '@/partage/lib/erreurs'
import { urlPhoto } from '@/partage/lib/photos'
import { Chargement, Message, Texte, Titre } from '@mobile/composants/base'
import { BadgeVerifie } from '@mobile/composants/BadgeVerifie'
import { InvitationConnexion } from '@mobile/composants/InvitationConnexion'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

// Date courte : heure si c'est aujourd'hui, sinon jour/mois
export function dateCourte(iso: string): string {
  const d = new Date(iso)
  const deux = (n: number) => String(n).padStart(2, '0')
  const maintenant = new Date()
  return d.toDateString() === maintenant.toDateString()
    ? `${deux(d.getHours())}:${deux(d.getMinutes())}`
    : `${deux(d.getDate())}/${deux(d.getMonth() + 1)}`
}

export default function Messages() {
  const { session } = useSession()
  const navigation = useNavigation<NativeStackNavigationProp<ParamsRacine>>()
  const conversations = useConversations()

  if (!session) {
    return (
      <InvitationConnexion
        titre="Vos messages"
        texte="Connectez-vous pour échanger avec les annonceurs par la messagerie Keyli."
      />
    )
  }
  if (conversations.isPending) return <Chargement />

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <FlatList
        data={conversations.data ?? []}
        keyExtractor={(c) => `${c.property_id ?? 'direct'}-${c.interlocuteur}`}
        contentContainerStyle={styles.contenu}
        refreshControl={
          <RefreshControl
            refreshing={conversations.isRefetching}
            onRefresh={() => void conversations.refetch()}
            tintColor={couleurs.primaire}
          />
        }
        ListHeaderComponent={
          <View style={styles.entete}>
            <Titre>Messages</Titre>
            {conversations.isError ? <Message>{messageErreur(conversations.error)}</Message> : null}
          </View>
        }
        ListEmptyComponent={
          conversations.isError ? undefined : (
            <View style={styles.vide}>
              <Ionicons name="chatbubbles-outline" size={40} color={couleurs.attenue} />
              <Texte attenue>
                Aucune conversation pour le moment. Écrivez à un annonceur depuis une annonce : sa réponse arrivera ici.
              </Texte>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separateur} />}
        renderItem={({ item: c }) => {
          const photo = urlPhoto(c.image_annonce, 120, 120)
          const nonLus = Number(c.non_lus) || 0
          return (
            <Pressable
              onPress={() =>
                navigation.navigate('Conversation', {
                  propertyId: c.property_id,
                  interlocuteur: c.interlocuteur,
                  nom: c.nom_interlocuteur,
                  titre: c.titre_annonce ?? undefined,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Conversation avec ${c.nom_interlocuteur}${nonLus ? `, ${nonLus} non lu${nonLus > 1 ? 's' : ''}` : ''}`}
              style={({ pressed }) => [styles.ligne, pressed && { opacity: 0.7 }]}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.vignette} />
              ) : (
                <View style={[styles.vignette, styles.vignetteVide]}>
                  <Ionicons name="person-outline" size={22} color={couleurs.attenue} />
                </View>
              )}
              <View style={styles.resume}>
                <View style={styles.haut}>
                  <View style={styles.nom}>
                    <Text style={[styles.texteNom, nonLus > 0 && styles.gras]} numberOfLines={1}>
                      {c.nom_interlocuteur}
                    </Text>
                    {c.interlocuteur_verifie ? <BadgeVerifie taille={15} libelle="Identité vérifiée" /> : null}
                  </View>
                  <Text style={styles.date}>{dateCourte(c.dernier_envoi)}</Text>
                </View>
                {c.titre_annonce ? (
                  <Text style={styles.annonce} numberOfLines={1}>
                    {c.titre_annonce}
                  </Text>
                ) : null}
                <View style={styles.haut}>
                  <Text style={[styles.apercu, nonLus > 0 && styles.apercuNonLu]} numberOfLines={1}>
                    {c.envoye_par_moi ? 'Vous : ' : ''}
                    {c.dernier_message}
                  </Text>
                  {nonLus > 0 ? <Text style={styles.compteur}>{nonLus}</Text> : null}
                </View>
              </View>
            </Pressable>
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  contenu: { padding: espaces.xl, flexGrow: 1 },
  entete: { gap: espaces.m, marginBottom: espaces.l },
  vide: { alignItems: 'center', gap: espaces.m, paddingTop: espaces.xxl },
  separateur: { height: 1, backgroundColor: couleurs.bordure, marginVertical: espaces.m },
  ligne: { flexDirection: 'row', gap: espaces.m, alignItems: 'center' },
  vignette: { width: 56, height: 56, borderRadius: rayons.champ, backgroundColor: couleurs.secondaire },
  vignetteVide: { alignItems: 'center', justifyContent: 'center' },
  resume: { flex: 1, gap: 2 },
  haut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaces.s },
  nom: { flexDirection: 'row', alignItems: 'center', gap: espaces.xs, flexShrink: 1 },
  texteNom: { fontSize: 16, fontWeight: '600', color: couleurs.texte, flexShrink: 1 },
  gras: { fontWeight: '800' },
  date: { fontSize: 12, color: couleurs.attenue },
  annonce: { fontSize: 13, color: couleurs.bleuLogo },
  apercu: { flex: 1, fontSize: 14, color: couleurs.attenue },
  apercuNonLu: { color: couleurs.texte, fontWeight: '600' },
  compteur: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: rayons.pilule,
    overflow: 'hidden',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: couleurs.surPrimaire,
    backgroundColor: couleurs.turquoise,
  },
})
