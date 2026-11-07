import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { useCommunes } from '@/hooks/useRecherche'
import { ZoneRevele } from '@/components/animation/ZoneRevele'
import { delaiCascade } from '@/lib/animation'
import { TexteCinema } from '@/components/animation/TexteCinema'

// Toutes les communes couvertes (liste fermée en base), chacune menant à la
// recherche filtrée. Tuiles typographiques : pas de photo d'illustration.
export function ExplorerCommunes() {
  const communes = useCommunes().data ?? []
  if (communes.length === 0) return null

  return (
    <section className="container py-16 md:py-20" aria-labelledby="titre-communes">
      <ZoneRevele>
        <div className="kf-revele max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-glow">Explorer</p>
          <TexteCinema
            id="titre-communes"
            as="h2"
            quandVisible
            delai={0.2}
            segments={[{ texte: 'Abidjan, ' }, { texte: 'commune par commune', className: 'text-primary-glow' }]}
            className="mt-1 font-titre text-3xl font-bold md:text-4xl"
          />
          <p className="mt-2 text-muted-foreground">
            {communes.length} communes couvertes. Choisissez la vôtre.
          </p>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {communes.map((c, i) => (
            <li key={c.id} className="kf-revele" style={delaiCascade(i + 1, 35)}>
              <Link
                to={`/recherche?commune=${c.id}`}
                className="group flex h-full items-center justify-between gap-3 rounded-accueil border bg-card px-4 py-4 shadow-sm transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-turquoise hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-turquoise/10">
                    <MapPin className="h-4 w-4 text-primary-glow" aria-hidden />
                  </span>
                  <span className="truncate font-semibold">{c.nom}</span>
                </span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-primary-glow"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </ZoneRevele>
    </section>
  )
}
