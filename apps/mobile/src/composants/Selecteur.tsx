// Liste de choix ouverte en fenêtre (commune, quartier) : un champ qui
// affiche la valeur, puis une liste filtrable au toucher.
import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'

export interface OptionSelecteur {
  valeur: string
  libelle: string
}

export function Selecteur({
  libelle,
  options,
  valeur,
  onChange,
  tous,
}: {
  libelle: string
  options: readonly OptionSelecteur[]
  valeur: string | undefined
  onChange: (v: string | undefined) => void
  // Libellé de l'option « aucun filtre »
  tous: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const choisie = options.find((o) => o.valeur === valeur)
  const proposees = useMemo(() => {
    const t = texte.trim().toLocaleLowerCase('fr')
    return t ? options.filter((o) => o.libelle.toLocaleLowerCase('fr').includes(t)) : options
  }, [options, texte])

  const fermer = () => {
    setOuvert(false)
    setTexte('')
  }
  const choisir = (v: string | undefined) => {
    onChange(v)
    fermer()
  }

  return (
    <View style={styles.groupe}>
      <Text style={styles.libelle}>{libelle}</Text>
      <Pressable
        onPress={() => setOuvert(true)}
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : ${choisie?.libelle ?? tous}`}
        style={styles.champ}
      >
        <Text style={[styles.valeur, !choisie && { color: couleurs.attenue }]} numberOfLines={1}>
          {choisie?.libelle ?? tous}
        </Text>
        <Ionicons name="chevron-down" size={18} color={couleurs.attenue} />
      </Pressable>

      <Modal visible={ouvert} animationType="slide" presentationStyle="pageSheet" onRequestClose={fermer}>
        <SafeAreaView style={styles.fenetre} edges={['top', 'bottom']}>
          <View style={styles.entete}>
            <Text style={styles.titre}>{libelle}</Text>
            <Pressable onPress={fermer} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={8}>
              <Ionicons name="close" size={26} color={couleurs.texte} />
            </Pressable>
          </View>
          <TextInput
            value={texte}
            onChangeText={setTexte}
            placeholder="Rechercher…"
            placeholderTextColor={couleurs.attenue}
            accessibilityLabel={`Rechercher dans la liste ${libelle}`}
            style={styles.recherche}
          />
          <FlatList
            data={proposees}
            keyExtractor={(o) => o.valeur}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              texte ? undefined : <Ligne libelle={tous} actif={!valeur} onPress={() => choisir(undefined)} />
            }
            renderItem={({ item }) => (
              <Ligne libelle={item.libelle} actif={item.valeur === valeur} onPress={() => choisir(item.valeur)} />
            )}
            ListEmptyComponent={<Text style={styles.vide}>Aucun résultat.</Text>}
          />
        </SafeAreaView>
      </Modal>
    </View>
  )
}

function Ligne({ libelle, actif, onPress }: { libelle: string; actif: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: actif }}
      style={({ pressed }) => [styles.ligne, pressed && { backgroundColor: couleurs.secondaire }]}
    >
      <Text style={[styles.valeur, actif && styles.valeurActive]}>{libelle}</Text>
      {actif ? <Ionicons name="checkmark" size={20} color={couleurs.primaire} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  groupe: { gap: espaces.xs, flex: 1 },
  libelle: { fontSize: 14, fontWeight: '600', color: couleurs.texte },
  champ: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.champ,
    paddingHorizontal: espaces.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.s,
  },
  valeur: { flex: 1, fontSize: 16, color: couleurs.texte },
  valeurActive: { fontWeight: '700' },
  fenetre: { flex: 1, backgroundColor: couleurs.fond },
  entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: espaces.l },
  titre: { fontSize: 18, fontWeight: '700', color: couleurs.texte },
  recherche: {
    marginHorizontal: espaces.l,
    marginBottom: espaces.s,
    minHeight: 46,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.champ,
    paddingHorizontal: espaces.m,
    fontSize: 16,
    color: couleurs.texte,
  },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.m + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
  },
  vide: { padding: espaces.l, color: couleurs.attenue },
})
