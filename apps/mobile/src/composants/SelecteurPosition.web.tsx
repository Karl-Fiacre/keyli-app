// Aperçu navigateur (expo start --web) : react-native-maps n'existe que sur
// téléphone. Seule la position de l'appareil est proposée ici.
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { messageErreur } from '@/partage/lib/erreurs'
import { Bouton } from '@mobile/composants/base'
import { positionActuelle, type Point } from '@mobile/services/native/position'
import { couleurs, espaces } from '@mobile/theme/tokens'

export function SelecteurPosition({
  valeur,
  onChange,
  erreur,
}: {
  valeur: Point | null
  onChange: (p: Point) => void
  erreur?: string
}) {
  const [recherche, setRecherche] = useState(false)
  const [probleme, setProbleme] = useState<string>()

  const maPosition = async () => {
    setRecherche(true)
    setProbleme(undefined)
    try {
      onChange(await positionActuelle())
    } catch (e) {
      setProbleme(messageErreur(e))
    } finally {
      setRecherche(false)
    }
  }

  return (
    <View style={styles.groupe}>
      <Text style={styles.libelle}>Emplacement exact du bien</Text>
      <Text style={styles.aide}>La carte s'affiche dans l'application sur téléphone.</Text>
      <Bouton libelle="Utiliser ma position" variante="secondaire" onPress={maPosition} chargement={recherche} />
      {valeur ? (
        <Text style={styles.aide}>
          Position retenue : {valeur.latitude.toFixed(5)}, {valeur.longitude.toFixed(5)}
        </Text>
      ) : null}
      {probleme || erreur ? <Text style={styles.erreur}>{probleme ?? erreur}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  groupe: { gap: espaces.s },
  libelle: { fontSize: 14, fontWeight: '600', color: couleurs.texte },
  aide: { fontSize: 13, color: couleurs.attenue },
  erreur: { fontSize: 13, color: couleurs.erreurTexte },
})
