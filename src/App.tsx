import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FournisseurSession } from '@/hooks/useSession'
import { MiseEnPage } from '@/components/layout/MiseEnPage'
import { CadreConnecte } from '@/components/layout/CadreConnecte'
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
import TableauDeBord from '@/pages/dashboard/TableauDeBord'

// Vitrine des composants de dashboard : développement uniquement (le code
// n'est pas inclus dans le build de production)
const Composants = import.meta.env.DEV ? lazy(() => import('@/pages/dev/Composants')) : null

const clientRequetes = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

function App() {
  return (
    <QueryClientProvider client={clientRequetes}>
      <FournisseurSession>
        <BrowserRouter>
          <Routes>
            {Composants && (
              <Route
                path="dev/composants/:section?"
                element={
                  <Suspense fallback={null}>
                    <Composants />
                  </Suspense>
                }
              />
            )}
            {/* Espace connecté : cadre du tableau de bord (barre latérale selon le rôle).
                Décision du porteur, 2026-10-31. L'admin garde son propre écran. */}
            <Route
              element={
                <RouteProtegee>
                  <CadreConnecte />
                </RouteProtegee>
              }
            >
              <Route path="tableau-de-bord" element={<TableauDeBord />} />
              <Route path="profil" element={<Profil />} />
              <Route path="abonnement" element={<Abonnement />} />
              <Route path="abonnement/retour" element={<RetourPaiement />} />
              <Route path="annonces" element={<MesAnnonces />} />
              <Route path="annonces/nouvelle" element={<PublierAnnonce />} />
              <Route path="messages" element={<Messages />} />
              <Route path="messages/:bien/:interlocuteur" element={<Messages />} />
              <Route path="favoris" element={<MesFavoris />} />
            </Route>
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
