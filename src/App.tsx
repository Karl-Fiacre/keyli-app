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
import MesAnnonces from '@/pages/MesAnnonces'
import PublierAnnonce from '@/pages/PublierAnnonce'
import Recherche from '@/pages/Recherche'
import FicheAnnonce from '@/pages/FicheAnnonce'
import Messages from '@/pages/Messages'
import MesFavoris from '@/pages/MesFavoris'
import Admin from '@/pages/admin/Admin'
import AdminIndicateurs from '@/pages/admin/AdminIndicateurs'
import AdminVerifications from '@/pages/admin/AdminVerifications'
import AdminSignalements from '@/pages/admin/AdminSignalements'
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
              <Route path="recherche" element={<Recherche />} />
              <Route path="annonce/:id" element={<FicheAnnonce />} />
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
              <Route
                path="annonces"
                element={
                  <RouteProtegee>
                    <MesAnnonces />
                  </RouteProtegee>
                }
              />
              <Route
                path="annonces/nouvelle"
                element={
                  <RouteProtegee>
                    <PublierAnnonce />
                  </RouteProtegee>
                }
              />
              <Route
                path="messages"
                element={
                  <RouteProtegee>
                    <Messages />
                  </RouteProtegee>
                }
              />
              <Route
                path="messages/:bien/:interlocuteur"
                element={
                  <RouteProtegee>
                    <Messages />
                  </RouteProtegee>
                }
              />
              <Route
                path="favoris"
                element={
                  <RouteProtegee>
                    <MesFavoris />
                  </RouteProtegee>
                }
              />
              <Route
                path="admin"
                element={
                  <RouteProtegee>
                    <Admin />
                  </RouteProtegee>
                }
              >
                <Route index element={<AdminIndicateurs />} />
                <Route path="verifications" element={<AdminVerifications />} />
                <Route path="signalements" element={<AdminSignalements />} />
              </Route>
              <Route path="*" element={<PageIntrouvable />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FournisseurSession>
    </QueryClientProvider>
  )
}

export default App
