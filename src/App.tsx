import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FournisseurSession } from '@/hooks/useSession'
import { MiseEnPage } from '@/components/layout/MiseEnPage'
import { RouteProtegee } from '@/components/RouteProtegee'
import Accueil from '@/pages/Accueil'
import Inscription from '@/pages/Inscription'
import Connexion from '@/pages/Connexion'
import VerifierEmail from '@/pages/VerifierEmail'
import MotDePasseOublie from '@/pages/MotDePasseOublie'
import NouveauMotDePasse from '@/pages/NouveauMotDePasse'
import Profil from '@/pages/Profil'
import Abonnement from '@/pages/Abonnement'
import RetourPaiement from '@/pages/RetourPaiement'
import PageIntrouvable from '@/pages/PageIntrouvable'

const clientRequetes = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

function App() {
  return (
    <QueryClientProvider client={clientRequetes}>
      <FournisseurSession>
        <BrowserRouter>
          <Routes>
            <Route element={<MiseEnPage />}>
              <Route index element={<Accueil />} />
              <Route path="inscription" element={<Inscription />} />
              <Route path="connexion" element={<Connexion />} />
              <Route path="verifier-email" element={<VerifierEmail />} />
              <Route path="mot-de-passe-oublie" element={<MotDePasseOublie />} />
              <Route path="nouveau-mot-de-passe" element={<NouveauMotDePasse />} />
              <Route
                path="profil"
                element={
                  <RouteProtegee>
                    <Profil />
                  </RouteProtegee>
                }
              />
              <Route
                path="abonnement"
                element={
                  <RouteProtegee>
                    <Abonnement />
                  </RouteProtegee>
                }
              />
              <Route
                path="abonnement/retour"
                element={
                  <RouteProtegee>
                    <RetourPaiement />
                  </RouteProtegee>
                }
              />
              <Route path="*" element={<PageIntrouvable />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FournisseurSession>
    </QueryClientProvider>
  )
}

export default App
