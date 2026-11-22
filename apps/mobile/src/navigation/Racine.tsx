// Navigation de l'application : onglets (Accueil, Recherche, Messages,
// Profil), page de connexion (premier écran d'un visiteur), fiche annonce,
// favoris, alertes, publication d'annonce (propriétaire, agence),
// vérification, abonnement, retours, réservations, et parcours de compte ouvert en fenêtre. Comme sur
// le web, la consultation des annonces est libre ; un compte connecté qui
// doit accepter les CGU voit d'abord l'écran d'acceptation.
import { useEffect, useState } from 'react'
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
  useNavigation,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSession } from '@/partage/hooks/useSession'
import { useProfil } from '@/partage/hooks/useProfil'
import { useMessagesNonLus, useMessagesTempsReel } from '@/partage/hooks/useMessagerie'
import { VERSION_CGU } from '@/partage/lib/juridique'
import Accueil from '@mobile/screens/Accueil'
import Recherche from '@mobile/screens/Recherche'
import Messages from '@mobile/screens/Messages'
import Conversation from '@mobile/screens/Conversation'
import Profil from '@mobile/screens/Profil'
import FicheAnnonce from '@mobile/screens/FicheAnnonce'
import Favoris from '@mobile/screens/Favoris'
import Alertes from '@mobile/screens/Alertes'
import PublierAnnonce from '@mobile/screens/PublierAnnonce'
import Connexion from '@mobile/screens/Connexion'
import Inscription from '@mobile/screens/Inscription'
import MotDePasseOublie from '@mobile/screens/MotDePasseOublie'
import AcceptationCgu from '@mobile/screens/AcceptationCgu'
import { Chargement } from '@mobile/composants/base'
import { EcranVerrou, useVerrouBiometrique } from '@mobile/composants/VerrouBiometrique'
import Verification from '@mobile/screens/Verification'
import Abonnement from '@mobile/screens/Abonnement'
import Retours from '@mobile/screens/Retours'
import Reservations from '@mobile/screens/Reservations'
import UtilisateursBloques from '@mobile/screens/UtilisateursBloques'
import SupprimerCompte from '@mobile/screens/SupprimerCompte'
import { useNotificationsPush } from '@mobile/composants/NotificationsPush'
import { optionsBarre } from '@mobile/composants/BarreOnglets'
import { couleurs } from '@mobile/theme/tokens'
import { ContexteExplorer, useExplorer } from '@mobile/navigation/explorer'
import type { ParamsCompte, ParamsOnglets, ParamsRacine } from '@mobile/navigation/types'

const Pile = createNativeStackNavigator<ParamsRacine>()
const PileCompte = createNativeStackNavigator<ParamsCompte>()
const Onglets = createBottomTabNavigator<ParamsOnglets>()
// Navigation depuis une notification touchée (hors des écrans)
const navigationRef = createNavigationContainerRef<ParamsRacine>()

const THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: couleurs.primaire,
    background: couleurs.fond,
    card: couleurs.fond,
    text: couleurs.texte,
    border: couleurs.bordure,
  },
}

const ICONES: Record<keyof ParamsOnglets, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Accueil: ['home', 'home-outline'],
  Recherche: ['search', 'search-outline'],
  Messages: ['chatbubbles', 'chatbubbles-outline'],
  Profil: ['person', 'person-outline'],
}

function NavigationOnglets() {
  // Messagerie : rafraîchie en temps réel, pastille des messages non lus
  useMessagesTempsReel()
  const nonLus = useMessagesNonLus().data ?? 0
  return (
    <Onglets.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // Style de la barre (Keyli 3D ou classique) : composants/BarreOnglets.tsx
        ...optionsBarre(ICONES[route.name]),
      })}
    >
      <Onglets.Screen name="Accueil" component={Accueil} />
      <Onglets.Screen name="Recherche" component={Recherche} />
      <Onglets.Screen
        name="Messages"
        component={Messages}
        options={{
          tabBarBadge: nonLus > 0 ? (nonLus > 99 ? '99+' : nonLus) : undefined,
          tabBarBadgeStyle: { backgroundColor: couleurs.turquoise, color: couleurs.surPrimaire, fontSize: 11 },
        }}
      />
      <Onglets.Screen name="Profil" component={Profil} />
    </Onglets.Navigator>
  )
}

// Parcours de compte : se referme dès que la connexion réussit
function NavigationCompte() {
  const { session } = useSession()
  const navigation = useNavigation()
  const explorer = useExplorer()
  useEffect(() => {
    if (session && navigation.canGoBack()) navigation.goBack()
  }, [session, navigation])

  return (
    <PileCompte.Navigator screenOptions={{ headerTintColor: couleurs.primaire, headerBackTitle: 'Retour' }}>
      {/* Premier écran (photos en fond) : sans barre de titre */}
      <PileCompte.Screen name="Connexion" component={Connexion} options={{ title: 'Connexion', headerShown: !explorer }} />
      <PileCompte.Screen name="Inscription" component={Inscription} options={{ title: 'Inscription' }} />
      <PileCompte.Screen
        name="MotDePasseOublie"
        component={MotDePasseOublie}
        options={{ title: 'Mot de passe oublié' }}
      />
    </PileCompte.Navigator>
  )
}

export function Racine() {
  const { session, chargement } = useSession()
  const profil = useProfil()
  // Visiteur non connecté : l'application s'ouvre sur la page de connexion
  // (décision du porteur, 2026-11-22), jusqu'à ce qu'il se connecte ou
  // choisisse de découvrir les annonces sans compte
  const [explorer, setExplorer] = useState(false)
  const connexionDabord = !session && !explorer
  // Verrou Face ID / empreinte, si la personne l'a activé (Sprint 16)
  const verrou = useVerrouBiometrique(!!session, chargement)
  // Notifications push : jeton enregistré à la connexion, écran ouvert au
  // toucher (Sprint 17)
  const push = useNotificationsPush(!!session, navigationRef)

  if (chargement) return <Chargement />
  if (session && verrou.verrouille) return <EcranVerrou onDeverrouille={verrou.deverrouiller} />
  if (session && profil.isPending) return <Chargement />
  if (session && profil.data && profil.data.cgu_version !== VERSION_CGU) {
    return <AcceptationCgu dejaAcceptees={!!profil.data.cgu_version} />
  }

  return (
    <NavigationContainer ref={navigationRef} theme={THEME} onReady={push.pret}>
      <Pile.Navigator screenOptions={{ headerTintColor: couleurs.primaire, headerBackTitle: 'Retour' }}>
        {connexionDabord ? (
          // Visiteur non connecté : la page de connexion est le premier écran ;
          // une fois connecté, l'application s'ouvre sur l'accueil (onglets)
          <Pile.Screen name="Compte" options={{ headerShown: false }}>
            {() => (
              <ContexteExplorer.Provider value={() => setExplorer(true)}>
                <NavigationCompte />
              </ContexteExplorer.Provider>
            )}
          </Pile.Screen>
        ) : (
          <>
            <Pile.Screen name="Onglets" component={NavigationOnglets} options={{ headerShown: false }} />
            <Pile.Screen name="FicheAnnonce" component={FicheAnnonce} options={{ title: 'Annonce' }} />
            <Pile.Screen name="Conversation" component={Conversation} options={{ title: 'Conversation' }} />
            <Pile.Screen name="Favoris" component={Favoris} options={{ title: 'Mes favoris' }} />
            <Pile.Screen name="Alertes" component={Alertes} options={{ title: 'Mes alertes' }} />
            <Pile.Screen name="PublierAnnonce" component={PublierAnnonce} options={{ title: 'Nouvelle annonce' }} />
            <Pile.Screen name="Verification" component={Verification} options={{ title: 'Vérification' }} />
            <Pile.Screen name="Abonnement" component={Abonnement} options={{ title: 'Abonnement' }} />
            <Pile.Screen name="Retours" component={Retours} options={{ title: 'Donner mon avis' }} />
            <Pile.Screen name="Reservations" component={Reservations} options={{ title: 'Mes réservations' }} />
            <Pile.Screen
              name="UtilisateursBloques"
              component={UtilisateursBloques}
              options={{ title: 'Utilisateurs bloqués' }}
            />
            <Pile.Screen name="SupprimerCompte" component={SupprimerCompte} options={{ title: 'Supprimer mon compte' }} />
            {/* Connexion ouverte en fenêtre depuis l'application (visiteur sans
                compte) : se referme d'elle-même quand la session change */}
            <Pile.Group navigationKey={session ? 'connecte' : 'visiteur'}>
              <Pile.Screen
                name="Compte"
                component={NavigationCompte}
                options={{ headerShown: false, presentation: 'modal' }}
              />
            </Pile.Group>
          </>
        )}
      </Pile.Navigator>
    </NavigationContainer>
  )
}
