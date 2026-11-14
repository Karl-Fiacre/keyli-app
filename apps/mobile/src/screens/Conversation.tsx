// Fil d'une conversation dans l'application : mêmes règles que le web
// (FilConversation) — messages du plus ancien au plus récent, marquage « lu »
// à l'ouverture réelle, réponse (la base refuse tout démarchage à froid).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSession } from '@/partage/hooks/useSession'
import { useFil, useMarquerLu, useRepondre } from '@/partage/hooks/useMessagerie'
import { messageErreur } from '@/partage/lib/erreurs'
import { Chargement, Message, Texte } from '@mobile/composants/base'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

// Jour/mois et heure d'un message
function horodatage(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const deux = (n: number) => String(n).padStart(2, '0')
  return `${deux(d.getDate())}/${deux(d.getMonth() + 1)} ${deux(d.getHours())}:${deux(d.getMinutes())}`
}

export default function Conversation({ route, navigation }: NativeStackScreenProps<ParamsRacine, 'Conversation'>) {
  const { propertyId, interlocuteur, nom, titre } = route.params
  const { session } = useSession()
  const moi = session?.user.id
  const fil = useFil(propertyId, interlocuteur)
  const { mutate: marquer } = useMarquerLu()
  const repondre = useRepondre()
  const [message, setMessage] = useState('')
  const dejaMarque = useRef<string | undefined>(undefined)

  useLayoutEffect(() => {
    navigation.setOptions({ title: nom ?? 'Conversation' })
  }, [navigation, nom])

  const messages = fil.data ?? []
  // Dernier message reçu encore non lu : déclenche le marquage, une seule fois
  const dernierNonLu = [...messages].reverse().find((m) => m.to_user === moi && !m.read)?.id
  useEffect(() => {
    if (!dernierNonLu || dejaMarque.current === dernierNonLu) return
    dejaMarque.current = dernierNonLu
    marquer({ propertyId, interlocuteur })
  }, [dernierNonLu, propertyId, interlocuteur, marquer])

  const envoyer = () => {
    const texte = message.trim()
    if (!texte || repondre.isPending) return
    repondre.mutate({ propertyId, interlocuteur, message: texte }, { onSuccess: () => setMessage('') })
  }

  if (fil.isPending) return <Chargement />

  return (
    <SafeAreaView style={styles.ecran} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.plein}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {propertyId ? (
          <Pressable
            // Lien vers l'annonce depuis la messagerie, comme sur le web (source
            // limitée en base aux valeurs des statistiques de conversion)
            onPress={() => navigation.navigate('FicheAnnonce', { id: propertyId, source: 'lien_direct' })}
            accessibilityRole="link"
            style={({ pressed }) => [styles.annonce, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="home-outline" size={16} color={couleurs.bleuLogo} />
            <Text style={styles.texteAnnonce} numberOfLines={1}>
              {titre ?? "Voir l'annonce"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={couleurs.bleuLogo} />
          </Pressable>
        ) : null}

        {/* Liste inversée : le dernier message reste en bas, au-dessus du clavier */}
        <FlatList
          data={[...messages].reverse()}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.fil}
          ListEmptyComponent={
            fil.isError ? (
              <Message>{messageErreur(fil.error)}</Message>
            ) : (
              <Texte attenue>Aucun message pour le moment.</Texte>
            )
          }
          renderItem={({ item: m }) => {
            const deMoi = m.from_user === moi
            return (
              <View style={[styles.bulle, deMoi ? styles.bulleMoi : styles.bulleAutre]}>
                <Text style={[styles.corps, deMoi && { color: couleurs.surPrimaire }]}>{m.body}</Text>
                <Text style={[styles.heure, deMoi && { color: couleurs.texteClair }]}>
                  {horodatage(m.created_at)}
                  {deMoi && m.read ? ' · Lu' : ''}
                </Text>
              </View>
            )
          }}
        />

        {repondre.isError ? (
          <View style={styles.erreur}>
            <Message>{messageErreur(repondre.error)}</Message>
          </View>
        ) : null}

        <View style={styles.saisie}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Écrire un message…"
            placeholderTextColor={couleurs.attenue}
            accessibilityLabel="Votre réponse"
            multiline
            maxLength={2000}
            style={styles.champ}
          />
          <Pressable
            onPress={envoyer}
            disabled={!message.trim() || repondre.isPending}
            accessibilityRole="button"
            accessibilityLabel="Envoyer"
            style={({ pressed }) => [
              styles.envoyer,
              (pressed || !message.trim() || repondre.isPending) && { opacity: 0.5 },
            ]}
          >
            <Ionicons name="send" size={18} color={couleurs.surPrimaire} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  plein: { flex: 1 },
  annonce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.s,
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.m,
    backgroundColor: couleurs.secondaire,
  },
  texteAnnonce: { flex: 1, fontSize: 14, fontWeight: '600', color: couleurs.bleuLogo },
  fil: { padding: espaces.l, gap: espaces.s, flexGrow: 1 },
  bulle: { maxWidth: '80%', borderRadius: rayons.champ, paddingHorizontal: espaces.m, paddingVertical: espaces.s },
  bulleMoi: { alignSelf: 'flex-end', backgroundColor: couleurs.primaire },
  bulleAutre: { alignSelf: 'flex-start', backgroundColor: couleurs.secondaire },
  corps: { fontSize: 15, lineHeight: 21, color: couleurs.texte },
  heure: { marginTop: 2, fontSize: 11, textAlign: 'right', color: couleurs.attenue },
  erreur: { paddingHorizontal: espaces.l },
  saisie: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: espaces.s,
    padding: espaces.m,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  champ: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.champ,
    paddingHorizontal: espaces.m,
    paddingTop: espaces.s + 2,
    paddingBottom: espaces.s + 2,
    fontSize: 16,
    color: couleurs.texte,
  },
  envoyer: {
    width: 44,
    height: 44,
    borderRadius: rayons.pilule,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.primaire,
  },
})
