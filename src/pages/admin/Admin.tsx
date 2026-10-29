import { NavLink, Outlet } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { useEstAdmin } from '@/hooks/useAdmin'
import { useProfil } from '@/hooks/useProfil'
import { cn } from '@/lib/utils'

const ONGLETS = [
  { vers: '/admin', libelle: 'Indicateurs', fin: true },
  { vers: '/admin/verifications', libelle: 'Vérifications', fin: false },
  { vers: '/admin/signalements', libelle: 'Signalements', fin: false },
]

// Back-office (docs/MODULES/admin.md). L'accès est réservé aux admins par la
// base (chaque lecture et action contrôle est_admin_keyli) : ce garde-fou
// d'écran évite seulement d'afficher des pages vides aux autres comptes.
export default function Admin() {
  const profil = useProfil()
  const estAdmin = useEstAdmin()

  if (profil.isPending) return <p className="container py-16 text-center text-muted-foreground">Chargement…</p>
  if (!estAdmin) {
    return (
      <section className="container py-12">
        <Alert variant="erreur">Cet espace est réservé à l'équipe Keyli.</Alert>
      </section>
    )
  }

  return (
    <section className="container py-8 md:py-10">
      <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b" aria-label="Sections de l'administration">
        {ONGLETS.map((o) => (
          <NavLink
            key={o.vers}
            to={o.vers}
            end={o.fin}
            className={({ isActive }) =>
              cn(
                '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150',
                isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            {o.libelle}
          </NavLink>
        ))}
      </nav>
      <div className="pt-6">
        <Outlet />
      </div>
    </section>
  )
}
