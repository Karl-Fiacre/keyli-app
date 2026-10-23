import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'
import { useDeconnexion } from '@/hooks/useCompte'

// Mise en page commune : en-tête avec le logotype officiel
// (public/keyli-logo-full.svg, généré depuis docs/keyli_brand_assets — jamais
// redessiné dans un composant, docs/LOGO.md).
export function MiseEnPage() {
  const { session } = useSession()
  const deconnexion = useDeconnexion()
  const naviguer = useNavigate()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" aria-label="Keyli — accueil">
            <img src="/keyli-logo-full.svg" alt="Keyli" className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-2">
            {session ? (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/profil">Mon profil</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => deconnexion.mutate(undefined, { onSuccess: () => naviguer('/') })}
                >
                  Se déconnecter
                </Button>
              </>
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
        </div>
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
