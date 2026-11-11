// Verrou Face ID / empreinte (Sprint 16, choix du porteur du 2026-11-11).
// Activé depuis le profil ; l'application se verrouille à l'ouverture et
// après 2 minutes en arrière-plan. En cas d'échec, « Se connecter avec le
// mot de passe » ferme la session : rien n'est contourné.
import { useEffect, useRef, useState } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useDeconnexion } from '@/partage/hooks/useCompte'
import { Bouton, Logo, Message } from '@mobile/composants/base'
import { activerVerrou, authentifier, biometrieDisponible, verrouActive } from '@mobile/services/native/biometrie'
import { couleurs, espaces, polices } from '@mobile/theme/tokens'

const DELAI_ARRIERE_PLAN = 2 * 60_000

// Indique si l'application doit afficher le verrou. connecte : une session
// existe ; chargement : la session est encore en cours de lecture.
export function useVerrouBiometrique(connecte: boolean, chargement: boolean) {
  const [verrouille, setVerrouille] = useState(false)
  const demarre = useRef(false)
  const quitteeA = useRef<number | null>(null)

  // Ouverture de l'application : session déjà enregistrée → verrou
  useEffect(() => {
    if (chargement || demarre.current) return
    demarre.current = true
    if (connecte && verrouActive()) setVerrouille(true)
  }, [chargement, connecte])

  // Retour après un passage prolongé en arrière-plan
  useEffect(() => {
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'background') quitteeA.current = Date.now()
      if (etat === 'active' && quitteeA.current !== null) {
        const absence = Date.now() - quitteeA.current
        quitteeA.current = null
        if (connecte && verrouActive() && absence >= DELAI_ARRIERE_PLAN) setVerrouille(true)
      }
    })
    return () => abonnement.remove()
  }, [connecte])

  // Une déconnexion lève le verrou
  useEffect(() => {
    if (!connecte) setVerrouille(false)
  }, [connecte])

  return { verrouille, deverrouiller: () => setVerrouille(false) }
}

export function EcranVerrou({ onDeverrouille }: { onDeverrouille: () => void }) {
  const deconnexion = useDeconnexion()
  const [methode, setMethode] = useState<string | null>(null)
  const [echec, setEchec] = useState(false)
  const [encours, setEncours] = useState(false)

  const essayer = async () => {
    setEncours(true)
    setEchec(false)
    try {
      if (await authentifier('Déverrouiller Keyli')) onDeverrouille()
      else setEchec(true)
    } finally {
      setEncours(false)
    }
  }

  // Demande immédiate à l'affichage
  useEffect(() => {
    void biometrieDisponible().then((m) => {
      setMethode(m)
      // Biométrie retirée du téléphone entre-temps : verrou levé, la session
      // reste protégée par le code du téléphone
      if (!m) {
        activerVerrou(false)
        onDeverrouille()
      } else void essayer()
    })
  }, [])

  return (
    <View style={styles.ecran}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.contenu}>
        <Logo largeur={150} blanc />
        <Text style={styles.titre}>Keyli est verrouillé</Text>
        <Text style={styles.texte}>Déverrouillez avec {methode ?? 'la biométrie'} pour retrouver votre compte.</Text>
        {echec ? <Message>Identification non reconnue. Réessayez ou reconnectez-vous.</Message> : null}
        <View style={styles.boutons}>
          <Bouton
            libelle={`Déverrouiller avec ${methode ?? 'la biométrie'}`}
            variante="clair"
            onPress={() => void essayer()}
            chargement={encours}
          />
          <Bouton
            libelle="Se connecter avec le mot de passe"
            variante="contour"
            chargement={deconnexion.isPending}
            onPress={() => {
              activerVerrou(false)
              deconnexion.mutate()
            }}
          />
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.navyLogo },
  contenu: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: espaces.xl, gap: espaces.l },
  titre: { fontFamily: polices.titre, fontSize: 26, fontWeight: '700', color: couleurs.surPrimaire },
  texte: { fontSize: 15, lineHeight: 21, color: couleurs.texteClair, textAlign: 'center' },
  boutons: { alignSelf: 'stretch', gap: espaces.m, marginTop: espaces.l },
})
