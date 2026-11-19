// Point d'entrée de l'application mobile Keyli : mêmes fournisseurs que le
// web (React Query, session partagée), puis la navigation, recouverte au
// lancement par l'écran de démarrage animé.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { FournisseurSession, useSession } from '@/partage/hooks/useSession'
import { Racine } from '@mobile/navigation/Racine'
import { EcranDemarrage } from '@mobile/composants/EcranDemarrage'

const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

// L'écran de démarrage reste affiché tant que la session n'est pas lue,
// pour ne pas montrer un écran « déconnecté » une fraction de seconde
function Demarrage() {
  const { chargement } = useSession()
  return <EcranDemarrage pret={!chargement} />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <FournisseurSession>
          <StatusBar style="dark" />
          <Racine />
          <Demarrage />
        </FournisseurSession>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
