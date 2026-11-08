// Composants de base de l'application mobile, construits sur la charte
// (src/theme/tokens.ts). Les écrans composent ces éléments plutôt que de
// redéfinir leurs propres styles.
import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { couleurs, espaces, ombreCarte, polices, rayons } from '@mobile/theme/tokens'

// Écran défilant, clavier pris en compte (formulaires)
export function Ecran({ children, centre = false }: { children: ReactNode; centre?: boolean }) {
  return (
    <SafeAreaView style={styles.zoneSure} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.plein} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.contenu, centre && styles.centre]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export function Logo({ largeur = 160 }: { largeur?: number }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={{ width: largeur, height: largeur / 3.2 }}
      resizeMode="contain"
      accessibilityLabel="Keyli"
    />
  )
}

export function Titre({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.titre} accessibilityRole="header">
      {children}
    </Text>
  )
}

export function Texte({ children, attenue = false }: { children: ReactNode; attenue?: boolean }) {
  return <Text style={[styles.texte, attenue && styles.attenue]}>{children}</Text>
}

type VarianteBouton = 'primaire' | 'secondaire' | 'lien'

export function Bouton({
  libelle,
  onPress,
  variante = 'primaire',
  chargement = false,
  desactive = false,
}: {
  libelle: string
  onPress: () => void
  variante?: VarianteBouton
  chargement?: boolean
  desactive?: boolean
}) {
  const inactif = desactive || chargement
  return (
    <Pressable
      onPress={onPress}
      disabled={inactif}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif, busy: chargement }}
      style={({ pressed }) => [
        styles.bouton,
        variante === 'primaire' && styles.boutonPrimaire,
        variante === 'secondaire' && styles.boutonSecondaire,
        variante === 'lien' && styles.boutonLien,
        (pressed || inactif) && styles.boutonPresse,
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={variante === 'primaire' ? couleurs.surPrimaire : couleurs.primaire} />
      ) : (
        <Text
          style={[
            styles.libelleBouton,
            variante === 'primaire' && { color: couleurs.surPrimaire },
            variante === 'lien' && { color: couleurs.bleuLogo },
          ]}
        >
          {libelle}
        </Text>
      )}
    </Pressable>
  )
}

export function Champ({ libelle, erreur, ...props }: TextInputProps & { libelle: string; erreur?: string }) {
  return (
    <View style={styles.groupe}>
      <Text style={styles.libelle}>{libelle}</Text>
      <TextInput
        placeholderTextColor={couleurs.attenue}
        accessibilityLabel={libelle}
        style={[styles.champ, erreur ? styles.champErreur : null]}
        {...props}
      />
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
    </View>
  )
}

export function CaseACocher({
  coche,
  onChange,
  children,
  erreur,
}: {
  coche: boolean
  onChange: (v: boolean) => void
  children: ReactNode
  erreur?: string
}) {
  return (
    <View style={styles.groupe}>
      <Pressable
        onPress={() => onChange(!coche)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: coche }}
        style={styles.ligne}
      >
        <View style={[styles.case, coche && styles.caseCochee]}>
          {coche ? <Text style={styles.coche}>✓</Text> : null}
        </View>
        <View style={styles.plein}>{children}</View>
      </Pressable>
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
    </View>
  )
}

// Choix exclusif sous forme de pastilles (ex. type de compte)
export function Choix<T extends string>({
  libelle,
  options,
  valeur,
  onChange,
}: {
  libelle: string
  options: readonly { valeur: T; libelle: string }[]
  valeur: T
  onChange: (v: T) => void
}) {
  return (
    <View style={styles.groupe}>
      <Text style={styles.libelle}>{libelle}</Text>
      <View style={styles.pastilles}>
        {options.map((o) => {
          const actif = o.valeur === valeur
          return (
            <Pressable
              key={o.valeur}
              onPress={() => onChange(o.valeur)}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              style={[styles.pastille, actif && styles.pastilleActive]}
            >
              <Text style={[styles.libellePastille, actif && { color: couleurs.surPrimaire }]}>{o.libelle}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function Carte({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.carte, style]}>{children}</View>
}

export function Message({ children, type = 'erreur' }: { children: ReactNode; type?: 'erreur' | 'succes' }) {
  return (
    <View
      accessibilityRole="alert"
      style={[styles.message, type === 'succes' ? styles.messageSucces : styles.messageErreur]}
    >
      <Text style={{ color: type === 'succes' ? couleurs.succesTexte : couleurs.erreurTexte }}>{children}</Text>
    </View>
  )
}

export function Chargement() {
  return (
    <View style={[styles.plein, styles.centre, { backgroundColor: couleurs.fond }]}>
      <ActivityIndicator size="large" color={couleurs.primaire} />
    </View>
  )
}

const styles = StyleSheet.create({
  zoneSure: { flex: 1, backgroundColor: couleurs.fond },
  plein: { flex: 1 },
  contenu: { padding: espaces.xl, gap: espaces.l, flexGrow: 1 },
  centre: { justifyContent: 'center', alignItems: 'stretch' },
  titre: { fontFamily: polices.titre, fontSize: 26, fontWeight: '700', color: couleurs.texte },
  texte: { fontSize: 16, lineHeight: 23, color: couleurs.texte },
  attenue: { color: couleurs.attenue, fontSize: 15 },
  bouton: {
    minHeight: 50,
    borderRadius: rayons.champ,
    paddingHorizontal: espaces.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonPrimaire: { backgroundColor: couleurs.primaire },
  boutonSecondaire: { backgroundColor: couleurs.fond, borderWidth: 1, borderColor: couleurs.bordure },
  boutonLien: { minHeight: 40 },
  boutonPresse: { opacity: 0.7 },
  libelleBouton: { fontSize: 16, fontWeight: '600', color: couleurs.primaire },
  groupe: { gap: espaces.xs },
  libelle: { fontSize: 14, fontWeight: '600', color: couleurs.texte },
  champ: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.champ,
    paddingHorizontal: espaces.m,
    fontSize: 16,
    color: couleurs.texte,
    backgroundColor: couleurs.fond,
  },
  champErreur: { borderColor: couleurs.erreur },
  erreur: { fontSize: 13, color: couleurs.erreurTexte },
  ligne: { flexDirection: 'row', alignItems: 'flex-start', gap: espaces.m },
  case: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: couleurs.attenue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  caseCochee: { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
  coche: { color: couleurs.surPrimaire, fontSize: 15, fontWeight: '700' },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', gap: espaces.s },
  pastille: {
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.s + 2,
    borderRadius: rayons.pilule,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  pastilleActive: { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
  libellePastille: { fontSize: 14, fontWeight: '600', color: couleurs.texte },
  carte: { backgroundColor: couleurs.fond, borderRadius: rayons.carte, padding: espaces.l, ...ombreCarte },
  message: { borderRadius: rayons.champ, padding: espaces.m, borderWidth: 1 },
  messageErreur: { backgroundColor: couleurs.erreurFond, borderColor: couleurs.erreur },
  messageSucces: { backgroundColor: couleurs.succesFond, borderColor: couleurs.succes },
})
