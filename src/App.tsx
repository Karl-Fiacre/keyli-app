import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { journaliserErreur } from '@/lib/journal'
import { FournisseurSession } from '@/hooks/useSession'
import { MiseEnPage } from '@/components/layout/MiseEnPage'
import { CadreConnecte } from '@/components/layout/CadreConnecte'
import { RouteProtegee } from '@/components/RouteProtegee'
import Accueil from '@/pages/Accueil'
import PageIntrouvable from '@/pages/PageIntrouvable'
const Inscription = lazy(() => import('@/pages/Inscription'))
const Connexion = lazy(() => import('@/pages/Connexion'))
const VerifierEmail = lazy(() => import('@/pages/VerifierEmail'))
const MotDePasseOublie = lazy(() => import('@/pages/MotDePasseOublie'))
const NouveauMotDePasse = lazy(() => import('@/pages/NouveauMotDePasse'))
const Profil = lazy(() => import('@/pages/Profil'))
const Abonnement = lazy(() => import('@/pages/Abonnement'))
const RetourPaiement = lazy(() => import('@/pages/RetourPaiement'))
const MesAnnonces = lazy(() => import('@/pages/MesAnnonces'))
const PublierAnnonce = lazy(() => import('@/pages/PublierAnnonce'))
const Recherche = lazy(() => import('@/pages/Recherche'))
const FicheAnnonce = lazy(() => import('@/pages/FicheAnnonce'))
const Messages = lazy(() => import('@/pages/Messages'))
const MesFavoris = lazy(() => import('@/pages/MesFavoris'))
const Reservations = lazy(() => import('@/pages/Reservations'))
const Desinscription = lazy(() => import('@/pages/Desinscription'))
const Admin = lazy(() => import('@/pages/admin/Admin'))
const AdminIndicateurs = lazy(() => import('@/pages/admin/AdminIndicateurs'))
const AdminVerifications = lazy(() => import('@/pages/admin/AdminVerifications'))
const AdminSignalements = lazy(() => import('@/pages/admin/AdminSignalements'))
const AdminRetours = lazy(() => import('@/pages/admin/AdminRetours'))
const AdminSupport = lazy(() => import('@/pages/admin/AdminSupport'))
const Retours = lazy(() => import('@/pages/Retours'))
const TableauDeBord = lazy(() => import('@/pages/dashboard/TableauDeBord'))
const Conditions = lazy(() => import('@/pages/juridique/Conditions'))
const Confidentialite = lazy(() => import('@/pages/juridique/Confidentialite'))
const MentionsLegales = lazy(() => import('@/pages/juridique/MentionsLegales'))
const Aide = lazy(() => import('@/pages/juridique/Aide'))
const APropos = lazy(() => import('@/pages/APropos'))
const Partenaires = lazy(() => import('@/pages/Partenaires'))
const AdminPilote = lazy(() => import('@/pages/admin/AdminPilote'))
const AdminConversion = lazy(() => import('@/pages/admin/AdminConversion'))
const AdminPaiements = lazy(() => import('@/pages/admin/AdminPaiements'))
const AdminErreurs = lazy(() => import('@/pages/admin/AdminErreurs'))

// Pages chargées à la demande (Sprint 5, connexions mobiles lentes) : seul
// l'accueil est dans le fichier principal. Les cadres affichent un
// indicateur pendant le chargement (ChargementPage).

// Vitrine des composants de dashboard : développement uniquement (le code
// n'est pas inclus dans le build de production)
const Composants = import.meta.env.DEV ? lazy(() => import('@/pages/dev/Composants')) : null

// Les erreurs de lecture et d'écriture inattendues vont au journal (Sprint 6)
const clientRequetes = new QueryClient({
  queryCache: new QueryCache({ onError: (e) => journaliserErreur(e, 'lecture') }),
  mutationCache: new MutationCache({ onError: (e) => journaliserErreur(e, 'action') }),
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

function App() {
  return (
    <QueryClientProvider client={clientRequetes}>
      <FournisseurSession>
        {/* Animations cinématiques (docs/ANIMATIONS.md) : déplacements coupés si
            l'appareil demande de limiter les animations */}
        <MotionConfig reducedMotion="user">
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
                <Route path="reservations" element={<Reservations />} />
                <Route path="retours" element={<Retours />} />
              </Route>
              <Route element={<MiseEnPage />}>
                <Route index element={<Accueil />} />
                <Route path="recherche" element={<Recherche />} />
                <Route path="annonce/:id" element={<FicheAnnonce />} />
                <Route path="inscription" element={<Inscription />} />
                <Route path="connexion" element={<Connexion />} />
                <Route path="desinscription" element={<Desinscription />} />
                <Route path="conditions" element={<Conditions />} />
                <Route path="confidentialite" element={<Confidentialite />} />
                <Route path="mentions-legales" element={<MentionsLegales />} />
                <Route path="aide" element={<Aide />} />
                <Route path="a-propos" element={<APropos />} />
                <Route path="partenaires" element={<Partenaires />} />
                {/* Ancienne adresse du pilote (liens déjà partagés) */}
                <Route path="pilote" element={<Navigate to="/partenaires" replace />} />
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
                  <Route path="retours" element={<AdminRetours />} />
                  <Route path="support" element={<AdminSupport />} />
                  <Route path="pilote" element={<AdminPilote />} />
                  <Route path="conversion" element={<AdminConversion />} />
                  <Route path="paiements" element={<AdminPaiements />} />
                  <Route path="erreurs" element={<AdminErreurs />} />
                </Route>
                <Route path="*" element={<PageIntrouvable />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </MotionConfig>
      </FournisseurSession>
    </QueryClientProvider>
  )
}

export default App
