// « Créer une alerte » depuis la recherche : enregistre les filtres en cours
// (hors équipements et tri). Même règle que le web (etatBoutonAlerte,
// src/partage/lib/recherche.ts) ; la base notifie ensuite le compte à
// chaque nouvelle annonce correspondante.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSession } from '@/partage/hooks/useSession'
import { useMesAlertes } from '@/partage/hooks/useTableauDeBord'
import { useBasculerAlerte, useCreerAlerte } from '@/partage/hooks/useAlertes'
import type { FiltresRecherche } from '@/partage/hooks/useRecherche'
import { etatBoutonAlerte } from '@/partage/lib/recherche'
import { messageErreur } from '@/partage/lib/erreurs'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

export function BoutonAlerte({ filtres }: { filtres: FiltresRecherche }) {
  const navigation = useNavigation<NativeStackNavigationProp<ParamsRacine>>()
  const { session } = useSession()
  const alertes = useMesAlertes()
  const creer = useCreerAlerte()
  const basculer = useBasculerAlerte()
  const { criteres, vide, existante, conseil } = etatBoutonAlerte(filtres, alertes.data ?? [])
  const erreur = creer.error ?? basculer.error

  let icone: 'notifications-outline' | 'notifications' | 'checkmark' = 'notifications-outline'
  let libelle = 'Créer une alerte'
  let action: (() => void) | null = () => creer.mutate(criteres)
  if (!session) {
    action = () => navigation.navigate('Compte', { screen: 'Connexion' })
  } else if (existante?.actif) {
    icone = 'checkmark'
    libelle = 'Alerte active'
    action = null
  } else if (existante) {
    icone = 'notifications'
    libelle = "Réactiver l'alerte"
    action = () => basculer.mutate({ id: existante.id, actif: true })
  } else if (vide || alertes.isPending) {
    action = null
  }
  const enCours = creer.isPending || basculer.isPending

  return (
    <View style={{ gap: espaces.xs }}>
      <Pressable
        onPress={action ?? undefined}
        disabled={!action || enCours}
        accessibilityRole="button"
        accessibilityState={{ disabled: !action || enCours, busy: enCours }}
        style={({ pressed }) => [styles.bouton, (!action || pressed || enCours) && { opacity: 0.6 }]}
      >
        <Ionicons name={icone} size={18} color={couleurs.texte} />
        <Text style={styles.libelle}>{creer.isPending ? 'Création…' : libelle}</Text>
      </Pressable>
      {erreur ? (
        <Text style={styles.erreur}>{messageErreur(erreur)}</Text>
      ) : session && existante?.actif && creer.isSuccess ? (
        <Text style={styles.aide}>Vous serez prévenu à chaque nouvelle annonce correspondante.</Text>
      ) : session && conseil ? (
        <Text style={styles.aide}>{conseil}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  bouton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espaces.s,
    minHeight: 40,
    paddingHorizontal: espaces.m,
    borderRadius: rayons.pilule,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  libelle: { fontSize: 14, fontWeight: '600', color: couleurs.texte },
  aide: { fontSize: 13, color: couleurs.attenue },
  erreur: { fontSize: 13, color: couleurs.erreurTexte },
})
