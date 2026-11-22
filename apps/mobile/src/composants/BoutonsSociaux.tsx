// « Ou continuer avec » : Google, Apple, Facebook (2026-11-22). Trois boutons
// ronds de même taille (Apple accepte le logo seul s'il n'est pas plus petit
// que les autres). sombre : sur l'écran de bienvenue (photos en fond).
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  ConnexionAnnulee,
  connexionSociale,
  type FournisseurSocial,
} from '@mobile/services/native/connexionSociale'
import { messageErreur } from '@/partage/lib/erreurs'
import { couleurs, espaces } from '@mobile/theme/tokens'

const FOURNISSEURS: { id: FournisseurSocial; nom: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'google', nom: 'Google', icone: 'logo-google' },
  { id: 'apple', nom: 'Apple', icone: 'logo-apple' },
  { id: 'facebook', nom: 'Facebook', icone: 'logo-facebook' },
]

export function BoutonsSociaux({ sombre = false }: { sombre?: boolean }) {
  const [enCours, setEnCours] = useState<FournisseurSocial | null>(null)

  const lancer = async (f: FournisseurSocial) => {
    setEnCours(f)
    try {
      await connexionSociale(f)
    } catch (e) {
      if (!(e instanceof ConnexionAnnulee)) Alert.alert('Connexion impossible', messageErreur(e))
    } finally {
      setEnCours(null)
    }
  }

  const couleurTexte = sombre ? couleurs.texteClair : couleurs.attenue
  const couleurIcone = sombre ? couleurs.surPrimaire : couleurs.primaire

  return (
    <View style={styles.bloc}>
      <View style={styles.separateur}>
        <View style={[styles.trait, { backgroundColor: sombre ? couleurs.bordureClaire : couleurs.bordure }]} />
        <Text style={[styles.ou, { color: couleurTexte }]}>ou continuer avec</Text>
        <View style={[styles.trait, { backgroundColor: sombre ? couleurs.bordureClaire : couleurs.bordure }]} />
      </View>
      <View style={styles.rangee}>
        {FOURNISSEURS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => void lancer(f.id)}
            disabled={enCours !== null}
            accessibilityRole="button"
            accessibilityLabel={`Continuer avec ${f.nom}`}
            accessibilityState={{ disabled: enCours !== null, busy: enCours === f.id }}
            style={({ pressed }) => [
              styles.rond,
              sombre
                ? { borderColor: couleurs.bordureClaire }
                : { borderColor: couleurs.bordure, backgroundColor: couleurs.fond },
              (pressed || (enCours !== null && enCours !== f.id)) && styles.presse,
            ]}
          >
            {enCours === f.id ? (
              <ActivityIndicator color={couleurIcone} />
            ) : (
              <Ionicons name={f.icone} size={24} color={couleurIcone} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bloc: { gap: espaces.m },
  separateur: { flexDirection: 'row', alignItems: 'center', gap: espaces.s },
  trait: { flex: 1, height: StyleSheet.hairlineWidth },
  ou: { fontSize: 13 },
  rangee: { flexDirection: 'row', justifyContent: 'center', gap: espaces.l },
  rond: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presse: { opacity: 0.6 },
})
