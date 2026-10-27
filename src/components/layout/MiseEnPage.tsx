import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'
import { useDeconnexion } from '@/hooks/useCompte'
import { useProfil } from '@/hooks/useProfil'
import { useMessagesNonLus, useMessagesTempsReel } from '@/hooks/useMessagerie'
import { cn } from '@/lib/utils'

// Mise en page commune : en-tête avec le logotype officiel
// (public/keyli-logo-full.svg, généré depuis docs/keyli_brand_assets — jamais
// redessiné dans un composant, docs/LOGO.md). Sur petit écran, les liens
// passent dans un menu repliable.
export function MiseEnPage() {
  const { session } = useSession()
  const deconnexion = useDeconnexion()
  const naviguer = useNavigate()
  const { pathname } = useLocation()
  const role = useProfil().data?.role_keyli
  const publie = role === 'owner' || role === 'agency'
  const [menuOuvert, setMenuOuvert] = useState(false)
  // Messagerie : nouveaux messages en temps réel, pastille des non-lus
  useMessagesTempsReel()
  const nonLus = useMessagesNonLus().data ?? 0

  // Le menu mobile se referme à chaque changement de page
  useEffect(() => setMenuOuvert(false), [pathname])

  const liens: Array<{ vers: string; libelle: string; pastille?: number }> = [
    { vers: '/recherche', libelle: 'Rechercher' },
    { vers: '/messages', libelle: 'Messages', pastille: nonLus },
    { vers: '/favoris', libelle: 'Favoris' },
    ...(publie
      ? [
          { vers: '/annonces', libelle: 'Mes annonces' },
          { vers: '/abonnement', libelle: 'Abonnement' },
        ]
      : []),
    { vers: '/profil', libelle: 'Mon profil' },
  ]
  // Quitter d'abord la page en cours : sinon une page protégée renverrait vers
  // la connexion en mémorisant cette page, et le compte suivant y atterrirait
  const seDeconnecter = () => {
    naviguer('/', { replace: true })
    deconnexion.mutate()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link to="/" aria-label="Keyli — accueil" className="shrink-0">
            <img src="/keyli-logo-full.svg" alt="Keyli" className="h-9 w-auto" />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {(session ? liens : liens.slice(0, 1)).map((l) => (
              <Button key={l.vers} variant="ghost" asChild>
                <Link to={l.vers}>
                  {l.libelle}
                  <Pastille nombre={l.pastille} />
                </Link>
              </Button>
            ))}
            {session ? (
              <Button variant="outline" onClick={seDeconnecter}>
                Se déconnecter
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/connexion">Se connecter</Link>
                </Button>
                <Button asChild>
                  <Link to="/inscription">Créer un compte</Link>
                </Button>
              </>
            )}
          </nav>
          <Button
            variant="ghost"
            className="lg:hidden"
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOuvert}
            aria-controls="menu-principal"
            onClick={() => setMenuOuvert((o) => !o)}
          >
            {menuOuvert ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
        </div>
        <nav id="menu-principal" className={cn('border-t lg:hidden', !menuOuvert && 'hidden')}>
          <div className="container flex flex-col gap-1 py-3">
            {(session ? liens : liens.slice(0, 1)).map((l) => (
              <Button key={l.vers} variant="ghost" asChild className="justify-start">
                <Link to={l.vers}>
                  {l.libelle}
                  <Pastille nombre={l.pastille} />
                </Link>
              </Button>
            ))}
            {session ? (
              <Button variant="outline" onClick={seDeconnecter} className="mt-2">
                Se déconnecter
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="justify-start">
                  <Link to="/connexion">Se connecter</Link>
                </Button>
                <Button asChild className="mt-2">
                  <Link to="/inscription">Créer un compte</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Keyli — Nguessan-IT, Abidjan
      </footer>
    </div>
  )
}

// Nombre de messages non lus à côté du lien « Messages »
function Pastille({ nombre }: { nombre?: number }) {
  if (!nombre) return null
  return (
    <span className="ml-1.5 rounded-pill bg-primary px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary-foreground">
      {nombre > 99 ? '99+' : nombre}
      <span className="sr-only"> message{nombre > 1 ? 's' : ''} non lu{nombre > 1 ? 's' : ''}</span>
    </span>
  )
}
