// Point d'entrée de l'application mobile Keyli : mêmes fournisseurs que le
// web (React Query, session partagée), puis la navigation.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { FournisseurSession } from '@/partage/hooks/useSession'
import { Racine } from '@mobile/navigation/Racine'

const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <FournisseurSession>
          <StatusBar style="dark" />
          <Racine />
        </FournisseurSession>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
