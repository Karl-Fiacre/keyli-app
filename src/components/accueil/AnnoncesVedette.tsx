import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { CarteAnnonce } from '@/components/annonce/CarteAnnonce'
import { useRecherche } from '@/hooks/useRecherche'

const NOMBRE = 6

// Sélection réelle tirée de la base (tri « vérifiées d'abord ») — aucune
// annonce fictive. La section disparaît tant qu'il n'y a rien à montrer.
export function AnnoncesVedette() {
  const recherche = useRecherche({ avantages: [], tri: 'pertinence', page: 1 })
  const annonces = recherche.data?.annonces.slice(0, NOMBRE) ?? []

  if (recherche.isPending) {
    return (
      <Cadre>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="h-80 animate-pulse rounded-lg bg-secondary" />
          ))}
        </ul>
      </Cadre>
    )
  }
  if (annonces.length === 0) return null

  return (
    <Cadre>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {annonces.map((a, i) => (
          <li key={a.id} className="kf-cascade" style={{ ['--kf-delai' as string]: `${i * 60}ms` }}>
            <CarteAnnonce annonce={a} />
          </li>
        ))}
      </ul>
    </Cadre>
  )
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <section className="container py-16 md:py-20" aria-labelledby="titre-vedette">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-glow">À la une</p>
          <h2 id="titre-vedette" className="mt-1 font-titre text-3xl font-bold md:text-4xl">
            Logements de confiance
          </h2>
          <p className="mt-2 text-muted-foreground">Les annonces vérifiées apparaissent en premier.</p>
        </div>
        <Link
          to="/recherche"
          className="group inline-flex items-center gap-1.5 font-semibold text-primary-glow hover:underline"
        >
          Voir toutes les annonces
          <ArrowRight
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </Link>
      </div>
      {children}
    </section>
  )
}
