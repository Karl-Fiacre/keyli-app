import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, Search } from 'lucide-react'
import { ClocheNotifications } from '@/components/layout/ClocheNotifications'
import { useDeconnexion } from '@/hooks/useCompte'
import { cn } from '@/lib/utils'
import { initiales } from '@/lib/format'

// Barre du haut des dashboards (KEYLI_DASHBOARD_DESIGN_SPEC.md §2) : recherche
// facultative, cloche de notifications (composant existant), avatar avec nom
// et rôle ; le menu profil s'ouvre en fondu + légère descente (spec 5.3).
export function DashboardTopbar({
  nom,
  role,
  photo,
  recherche,
}: {
  nom: string
  role: string // libellé affiché, ex. « Compte Agence »
  photo?: string | null
  recherche?: { placeholder: string; onRecherche: (texte: string) => void }
}) {
  const naviguer = useNavigate()
  const deconnexion = useDeconnexion()
  const [menu, setMenu] = useState(false)
  const conteneur = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const clic = (e: MouseEvent) => {
      if (!conteneur.current?.contains(e.target as Node)) setMenu(false)
    }
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', clic)
    document.addEventListener('keydown', touche)
    return () => {
      document.removeEventListener('mousedown', clic)
      document.removeEventListener('keydown', touche)
    }
  }, [menu])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      {recherche ? (
        <form
          role="search"
          className="relative min-w-0 max-w-md flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            const champ = new FormData(e.currentTarget).get('q')
            recherche.onRecherche(String(champ ?? '').trim())
          }}
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            name="q"
            type="search"
            placeholder={recherche.placeholder}
            aria-label={recherche.placeholder}
            className="h-10 w-full rounded-pill border border-input bg-secondary/60 pl-9 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
      ) : (
        <div className="flex-1" />
      )}

      <div className="ml-auto flex items-center gap-1">
        <ClocheNotifications />
        <div ref={conteneur} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {photo ? (
              <img src={photo} alt="" className="h-9 w-9 rounded-pill object-cover" />
            ) : (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-pill bg-primary text-xs font-bold text-primary-foreground"
                aria-hidden
              >
                {initiales(nom)}
              </span>
            )}
            <span className="hidden text-left sm:block">
              <span className="block max-w-40 truncate text-sm font-semibold">{nom}</span>
              <span className="block text-xs text-muted-foreground">{role}</span>
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none',
                menu && 'rotate-180',
              )}
              aria-hidden
            />
          </button>
          {menu && (
            <div
              role="menu"
              className="kf-panneau-ouvre absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border bg-card py-1 shadow-lift"
            >
              <Link
                role="menuitem"
                to="/profil"
                className="block px-4 py-2 text-sm hover:bg-secondary"
                onClick={() => setMenu(false)}
              >
                Mon profil
              </Link>
              <button
                role="menuitem"
                type="button"
                className="block w-full px-4 py-2 text-left text-sm hover:bg-secondary"
                onClick={() => {
                  setMenu(false)
                  naviguer('/', { replace: true })
                  deconnexion.mutate()
                }}
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
