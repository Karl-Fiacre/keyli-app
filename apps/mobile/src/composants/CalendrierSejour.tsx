// Calendrier de séjour : 1er toucher = arrivée, 2e toucher = départ. Les
// jours passés sont grisés. Même grille et même règle de choix que le web
// (grilleMois, choisirJourSejour : src/partage/lib/sejour.ts).
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  ajouterMois,
  aujourdhuiIso,
  choisirJourSejour,
  grilleMois,
  jourDepuisIso,
  premierDuMois,
} from '@/partage/lib/sejour'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'

const JOURS = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di']
// Une case = 1/7 de la largeur
const CASE = `${100 / 7}%` as const

export function CalendrierSejour({
  arrivee,
  depart,
  onChange,
}: {
  arrivee: string | null
  depart: string | null
  onChange: (arrivee: string | null, depart: string | null) => void
}) {
  const aujourdhui = aujourdhuiIso()
  const [mois, setMois] = useState(() => premierDuMois(arrivee ?? aujourdhui))
  const { decalage, jours } = grilleMois(mois)
  const titre = jourDepuisIso(mois).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const premierPossible = mois <= premierDuMois(aujourdhui)

  return (
    <View style={{ gap: espaces.s }}>
      <View style={styles.entete}>
        <Pressable
          onPress={() => setMois(ajouterMois(mois, -1))}
          disabled={premierPossible}
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
          hitSlop={8}
          style={premierPossible && { opacity: 0.3 }}
        >
          <Ionicons name="chevron-back" size={22} color={couleurs.texte} />
        </Pressable>
        <Text style={styles.titre}>{titre}</Text>
        <Pressable
          onPress={() => setMois(ajouterMois(mois, 1))}
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={22} color={couleurs.texte} />
        </Pressable>
      </View>
      <Text style={styles.aide} accessibilityLiveRegion="polite">
        {!arrivee ? "Choisissez la date d'arrivée" : !depart ? 'Choisissez la date de départ' : 'Dates choisies'}
      </Text>

      <View style={styles.grille}>
        {JOURS.map((j) => (
          <Text key={j} style={[styles.case, styles.nomJour]}>
            {j}
          </Text>
        ))}
        {Array.from({ length: decalage }, (_, i) => (
          <View key={`v${i}`} style={styles.case} />
        ))}
        {jours.map((jour) => {
          const passe = jour < aujourdhui
          const borne = jour === arrivee || jour === depart
          const dedans = !!arrivee && !!depart && jour > arrivee && jour < depart
          return (
            <Pressable
              key={jour}
              disabled={passe}
              onPress={() => {
                const choix = choisirJourSejour(arrivee, depart, jour)
                onChange(choix.arrivee, choix.depart)
              }}
              accessibilityRole="button"
              accessibilityState={{ disabled: passe, selected: borne }}
              accessibilityLabel={jourDepuisIso(jour).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              style={[styles.case, styles.jour, dedans && styles.dedans, borne && styles.borne]}
            >
              <Text
                style={[
                  styles.chiffre,
                  passe && styles.passe,
                  jour === aujourdhui && !borne && styles.aujourdhui,
                  borne && styles.chiffreBorne,
                ]}
              >
                {jourDepuisIso(jour).getDate()}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {arrivee || depart ? (
        <Pressable onPress={() => onChange(null, null)} accessibilityRole="button" style={styles.effacer}>
          <Text style={styles.lien}>Effacer les dates</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titre: { fontSize: 16, fontWeight: '700', color: couleurs.texte, textTransform: 'capitalize' },
  aide: { fontSize: 14, color: couleurs.attenue, textAlign: 'center' },
  grille: { flexDirection: 'row', flexWrap: 'wrap', rowGap: espaces.xs },
  case: { width: CASE, alignItems: 'center', justifyContent: 'center' },
  nomJour: { fontSize: 12, color: couleurs.attenue, textAlign: 'center', paddingVertical: espaces.xs },
  jour: { height: 42 },
  dedans: { backgroundColor: couleurs.turquoiseFond },
  borne: { backgroundColor: couleurs.primaire, borderRadius: rayons.champ },
  chiffre: { fontSize: 15, color: couleurs.texte },
  chiffreBorne: { color: couleurs.surPrimaire, fontWeight: '700' },
  passe: { color: couleurs.bordure },
  aujourdhui: { color: couleurs.bleuLogo, fontWeight: '700' },
  effacer: { alignSelf: 'flex-end', paddingVertical: espaces.xs },
  lien: { fontSize: 14, fontWeight: '600', color: couleurs.bleuLogo },
})
