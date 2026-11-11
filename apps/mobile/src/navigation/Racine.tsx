// Navigation de l'application : onglets (Accueil, Recherche, Messages,
// Profil), écran de bienvenue (visiteur non connecté), fiche annonce,
// favoris, alertes, publication d'annonce (propriétaire, agence), et parcours de compte ouvert en fenêtre. Comme sur
// le web, la consultation des annonces est libre ; un compte connecté qui
// doit accepter les CGU voit d'abord l'écran d'acceptation.
import { useEffect, useState } from 'react'
import { NavigationContainer, DefaultTheme, useNavigation } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSession } from '@/partage/hooks/useSession'
import { useProfil } from '@/partage/hooks/useProfil'
import { VERSION_CGU } from '@/partage/lib/juridique'
import Accueil from '@mobile/screens/Accueil'
import Recherche from '@mobile/screens/Recherche'
import Messages from '@mobile/screens/Messages'
import Profil from '@mobile/screens/Profil'
import FicheAnnonce from '@mobile/screens/FicheAnnonce'
import Bienvenue from '@mobile/screens/Bienvenue'
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
import { couleurs } from '@mobile/theme/tokens'
import type { ParamsCompte, ParamsOnglets, ParamsRacine } from '@mobile/navigation/types'

const Pile = createNativeStackNavigator<ParamsRacine>()
const PileCompte = createNativeStackNavigator<ParamsCompte>()
const Onglets = createBottomTabNavigator<ParamsOnglets>()

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
  return (
    <Onglets.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: couleurs.primaire,
        tabBarInactiveTintColor: couleurs.attenue,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={ICONES[route.name][focused ? 0 : 1]} color={color} size={size} />
        ),
      })}
    >
      <Onglets.Screen name="Accueil" component={Accueil} />
      <Onglets.Screen name="Recherche" component={Recherche} />
      <Onglets.Screen name="Messages" component={Messages} />
      <Onglets.Screen name="Profil" component={Profil} />
    </Onglets.Navigator>
  )
}

// Parcours de compte : se referme dès que la connexion réussit
function NavigationCompte() {
  const { session } = useSession()
  const navigation = useNavigation()
  useEffect(() => {
    if (session && navigation.canGoBack()) navigation.goBack()
  }, [session, navigation])

  return (
    <PileCompte.Navigator screenOptions={{ headerTintColor: couleurs.primaire, headerBackTitle: 'Retour' }}>
      <PileCompte.Screen name="Connexion" component={Connexion} options={{ title: 'Connexion' }} />
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
  // Visiteur non connecté : l'application s'ouvre sur l'écran de bienvenue,
  // jusqu'à ce qu'il se connecte ou choisisse de découvrir sans compte
  const [explorer, setExplorer] = useState(false)
  const bienvenue = !session && !explorer
  // Verrou Face ID / empreinte, si la personne l'a activé (Sprint 16)
  const verrou = useVerrouBiometrique(!!session, chargement)

  if (chargement) return <Chargement />
  if (session && verrou.verrouille) return <EcranVerrou onDeverrouille={verrou.deverrouiller} />
  if (session && profil.isPending) return <Chargement />
  if (session && profil.data && profil.data.cgu_version !== VERSION_CGU) {
    return <AcceptationCgu dejaAcceptees={!!profil.data.cgu_version} />
  }

  return (
    <NavigationContainer theme={THEME}>
      <Pile.Navigator screenOptions={{ headerTintColor: couleurs.primaire, headerBackTitle: 'Retour' }}>
        {bienvenue ? (
          <Pile.Screen name="Bienvenue" options={{ headerShown: false }}>
            {() => <Bienvenue onExplorer={() => setExplorer(true)} />}
          </Pile.Screen>
        ) : (
          <>
            <Pile.Screen name="Onglets" component={NavigationOnglets} options={{ headerShown: false }} />
            <Pile.Screen name="FicheAnnonce" component={FicheAnnonce} options={{ title: 'Annonce' }} />
            <Pile.Screen name="Favoris" component={Favoris} options={{ title: 'Mes favoris' }} />
            <Pile.Screen name="Alertes" component={Alertes} options={{ title: 'Mes alertes' }} />
            <Pile.Screen name="PublierAnnonce" component={PublierAnnonce} options={{ title: 'Nouvelle annonce' }} />
            <Pile.Screen name="Verification" component={Verification} options={{ title: 'Vérification' }} />
          </>
        )}
        {/* Le parcours de compte se referme de lui-même quand la session change
            (connexion depuis la bienvenue ou depuis un onglet) */}
        <Pile.Group navigationKey={session ? 'connecte' : 'visiteur'}>
          <Pile.Screen
            name="Compte"
            component={NavigationCompte}
            options={{ headerShown: false, presentation: 'modal' }}
          />
        </Pile.Group>
      </Pile.Navigator>
    </NavigationContainer>
  )
}
