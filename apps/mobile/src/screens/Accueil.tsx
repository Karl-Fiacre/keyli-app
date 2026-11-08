// Accueil — présentation courte et catalogue (annonces vérifiées d'abord,
// comme l'accueil du web).
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { FiltresRecherche } from '@/partage/hooks/useRecherche'
import { ListeAnnonces } from '@mobile/composants/ListeAnnonces'
import { Bouton, Logo, Texte, Titre } from '@mobile/composants/base'
import { couleurs, espaces } from '@mobile/theme/tokens'
import type { ParamsOnglets } from '@mobile/navigation/types'

const CATALOGUE: FiltresRecherche = { avantages: [], tri: 'pertinence', page: 1 }

export default function Accueil({ navigation }: BottomTabScreenProps<ParamsOnglets, 'Accueil'>) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: couleurs.fond }} edges={['top']}>
      <ListeAnnonces
        filtres={CATALOGUE}
        entete={
          <View style={{ gap: espaces.m, marginBottom: espaces.xl }}>
            <Logo largeur={130} />
            <Titre>Le logement de confiance à Abidjan</Titre>
            <Texte attenue>Annonces vérifiées, contact par la messagerie Keyli, visites organisées.</Texte>
            <Bouton libelle="Rechercher un logement" onPress={() => navigation.navigate('Recherche')} />
          </View>
        }
      />
    </SafeAreaView>
  )
}
