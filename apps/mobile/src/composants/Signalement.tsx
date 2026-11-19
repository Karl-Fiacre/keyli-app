// Signaler une annonce ou un utilisateur (exigence des boutiques pour le
// contenu généré par les utilisateurs) — mêmes motifs et mêmes règles que
// le web (BoutonSignaler, ActionsInterlocuteur) ; la base vérifie tout.
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { MOTIFS_SIGNALEMENT, useSignaler, type MotifSignalement } from '@/partage/hooks/useVerification'
import { useSignalerUtilisateur } from '@/partage/hooks/useBlocages'
import { messageErreur } from '@/partage/lib/erreurs'
import { Bouton, Message, Texte, Titre } from '@mobile/composants/base'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'

export type CibleSignalement =
  | { type: 'annonce'; propertyId: string }
  | { type: 'utilisateur'; utilisateurId: string; nom: string }

export function Signalement({
  cible,
  visible,
  onFermer,
}: {
  cible: CibleSignalement
  visible: boolean
  onFermer: () => void
}) {
  const signalerAnnonce = useSignaler()
  const signalerUtilisateur = useSignalerUtilisateur()
  const mutation = cible.type === 'annonce' ? signalerAnnonce : signalerUtilisateur
  const [motif, setMotif] = useState<MotifSignalement | ''>('')
  const [precision, setPrecision] = useState('')
  const precisionRequise = motif === 'autre'
  const pret = !!motif && (!precisionRequise || !!precision.trim())

  const envoyer = () => {
    if (!motif || !pret) return
    if (cible.type === 'annonce') signalerAnnonce.mutate({ propertyId: cible.propertyId, motif, precision })
    else signalerUtilisateur.mutate({ utilisateurId: cible.utilisateurId, motif, precision })
  }

  const titre = cible.type === 'annonce' ? 'Signaler cette annonce' : `Signaler ${cible.nom}`

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onFermer}>
      <SafeAreaView style={styles.ecran}>
        <View style={styles.entete}>
          <Titre>{titre}</Titre>
          <Pressable onPress={onFermer} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={12}>
            <Ionicons name="close" size={26} color={couleurs.texte} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          {mutation.isSuccess ? (
            <>
              <Message type="succes">Merci : votre signalement a été transmis à l'équipe Keyli.</Message>
              <Bouton libelle="Fermer" onPress={onFermer} />
            </>
          ) : (
            <>
              <Texte attenue>L'équipe Keyli examine chaque signalement.</Texte>
              <View accessibilityRole="radiogroup">
                {MOTIFS_SIGNALEMENT.map(([valeur, libelle]) => {
                  const actif = motif === valeur
                  return (
                    <Pressable
                      key={valeur}
                      onPress={() => setMotif(valeur)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: actif }}
                      style={styles.option}
                    >
                      <Ionicons
                        name={actif ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={actif ? couleurs.primaire : couleurs.attenue}
                      />
                      <Text style={styles.libelle}>{libelle}</Text>
                    </Pressable>
                  )
                })}
              </View>
              <TextInput
                value={precision}
                onChangeText={setPrecision}
                placeholder={precisionRequise ? 'Précision (obligatoire)' : 'Précision (facultative)'}
                placeholderTextColor={couleurs.attenue}
                accessibilityLabel="Précision"
                multiline
                maxLength={1000}
                style={styles.champ}
              />
              {mutation.isError ? <Message>{messageErreur(mutation.error)}</Message> : null}
              <Bouton
                libelle="Envoyer le signalement"
                onPress={envoyer}
                desactive={!pret}
                chargement={mutation.isPending}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaces.l,
    paddingTop: espaces.l,
  },
  contenu: { padding: espaces.l, gap: espaces.m },
  option: { flexDirection: 'row', alignItems: 'center', gap: espaces.m, paddingVertical: espaces.s + 2 },
  libelle: { fontSize: 16, color: couleurs.texte, flex: 1 },
  champ: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.champ,
    padding: espaces.m,
    fontSize: 16,
    color: couleurs.texte,
    textAlignVertical: 'top',
  },
})
