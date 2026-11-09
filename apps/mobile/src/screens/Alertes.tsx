// Mes alertes de recherche — même liste et mêmes libellés que le tableau de
// bord web (useMesAlertes, libelleAlerte). Une alerte se met en pause ou se
// réactive, jamais supprimée (règle en base) ; « Voir » ouvre la recherche
// correspondante (filtresDepuisAlerte).
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSession } from '@/partage/hooks/useSession'
import { useMesAlertes } from '@/partage/hooks/useTableauDeBord'
import { useBasculerAlerte } from '@/partage/hooks/useAlertes'
import { libelleAlerte } from '@/partage/lib/dashboard'
import { filtresDepuisAlerte } from '@/partage/lib/recherche'
import { messageErreur } from '@/partage/lib/erreurs'
import { InvitationConnexion } from '@mobile/composants/InvitationConnexion'
import { Bouton, Carte, Chargement, Message, Texte } from '@mobile/composants/base'
import { couleurs, espaces } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

export default function Alertes({ navigation }: NativeStackScreenProps<ParamsRacine, 'Alertes'>) {
  const { session } = useSession()
  const alertes = useMesAlertes()
  const basculer = useBasculerAlerte()

  if (!session) {
    return (
      <InvitationConnexion
        titre="Mes alertes"
        texte="Connectez-vous pour être prévenu des nouvelles annonces qui vous correspondent."
      />
    )
  }
  if (alertes.isPending) return <Chargement />

  return (
    <FlatList
      data={alertes.data ?? []}
      keyExtractor={(a) => a.id}
      contentContainerStyle={styles.contenu}
      ItemSeparatorComponent={() => <View style={{ height: espaces.m }} />}
      ListHeaderComponent={
        <View style={{ gap: espaces.m, marginBottom: espaces.l }}>
          <Texte attenue>
            Vous êtes prévenu à chaque nouvelle annonce correspondant à une alerte active. Créez une alerte depuis
            la recherche, après avoir choisi vos filtres.
          </Texte>
          {alertes.isError ? <Message>{messageErreur(alertes.error)}</Message> : null}
          {basculer.isError ? <Message>{messageErreur(basculer.error)}</Message> : null}
        </View>
      }
      renderItem={({ item: a }) => (
        <Carte style={{ gap: espaces.s }}>
          <Text style={[styles.libelle, !a.actif && { color: couleurs.attenue }]}>
            {libelleAlerte(a.criteres as Record<string, unknown>, a.quartier, a.commune)}
            {a.actif ? '' : ' — en pause'}
          </Text>
          <Texte attenue>
            {a.nouvelles > 0
              ? `${a.nouvelles} nouvelle${a.nouvelles > 1 ? 's' : ''} cette semaine`
              : 'Rien de neuf cette semaine'}
          </Texte>
          <View style={styles.actions}>
            <Pressable
              onPress={() =>
                navigation.navigate('Onglets', {
                  screen: 'Recherche',
                  params: { filtres: filtresDepuisAlerte(a.criteres as Record<string, unknown>) },
                })
              }
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.lien}>Voir les annonces</Text>
            </Pressable>
            <Pressable
              onPress={() => basculer.mutate({ id: a.id, actif: !a.actif })}
              disabled={basculer.isPending && basculer.variables?.id === a.id}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.lienDiscret}>{a.actif ? 'Mettre en pause' : 'Réactiver'}</Text>
            </Pressable>
          </View>
        </Carte>
      )}
      ListEmptyComponent={
        alertes.isError ? undefined : (
          <View style={{ gap: espaces.m }}>
            <Texte attenue>Aucune alerte pour l'instant.</Texte>
            <Bouton
              libelle="Ouvrir la recherche"
              onPress={() => navigation.navigate('Onglets', { screen: 'Recherche' })}
            />
          </View>
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  contenu: { padding: espaces.xl, backgroundColor: couleurs.fond, flexGrow: 1 },
  libelle: { fontSize: 16, fontWeight: '600', color: couleurs.texte },
  actions: { flexDirection: 'row', gap: espaces.xl, marginTop: espaces.xs },
  lien: { fontSize: 14, fontWeight: '700', color: couleurs.bleuLogo },
  lienDiscret: { fontSize: 14, fontWeight: '600', color: couleurs.attenue },
})
