import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { CarteAnnonce } from '@/components/annonce/CarteAnnonce'
import { CarteCatalogue } from '@/components/annonce/CarteCatalogue'
import { BasculeVue } from '@/components/annonce/BasculeVue'
import { ZoneRevele } from '@/components/animation/ZoneRevele'
import { TAILLE_PAGE, useRecherche } from '@/hooks/useRecherche'
import { useVueCatalogue } from '@/hooks/useVueCatalogue'
import { messageErreur } from '@/lib/erreurs'
import { Revele } from '@/components/animation/Revele'
import { TexteCinema } from '@/components/animation/TexteCinema'
import { delaiCinema } from '@/lib/cinema'
import { cn } from '@/lib/utils'

// Catalogue des biens disponibles (décision du porteur, 2026-11-04) :
// toutes les annonces publiées, vérifiées d'abord, en liste ou sur une
// carte (positions approximatives). Données réelles de la base uniquement.
export function CatalogueAccueil() {
  const [page, setPage] = useState(1)
  const [vue, setVue] = useVueCatalogue()
  const recherche = useRecherche({ avantages: [], tri: 'pertinence', page })
  const annonces = recherche.data?.annonces ?? []
  const total = recherche.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / TAILLE_PAGE))

  // Aucune annonce publiée : la section n'a rien à montrer
  if (recherche.isSuccess && total === 0 && page === 1) return null

  return (
    <section id="catalogue" className="container scroll-mt-20 py-16 md:py-20" aria-labelledby="titre-catalogue">
      <ZoneRevele>
        <div className="kf-revele mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-glow">Catalogue</p>
            <TexteCinema
              id="titre-catalogue"
              as="h2"
              quandVisible
              delai={0.2}
              segments={[{ texte: 'Biens disponibles' }]}
              className="mt-1 font-titre text-3xl font-bold md:text-4xl"
            />
            <p className="mt-2 text-muted-foreground" aria-live="polite">
              {recherche.isPending
                ? 'Chargement des annonces…'
                : `${total} annonce${total > 1 ? 's' : ''} · les annonces vérifiées apparaissent en premier`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <BasculeVue vue={vue} onChange={setVue} />
            <Link
              to="/recherche"
              className="group inline-flex items-center gap-1.5 font-semibold text-primary-glow hover:underline"
            >
              Filtrer la recherche
              <ArrowRight
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </ZoneRevele>

      {recherche.isError && <Alert variant="erreur">{messageErreur(recherche.error)}</Alert>}

      {recherche.isPending ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="h-80 animate-pulse rounded-lg bg-secondary" />
          ))}
        </ul>
      ) : vue === 'carte' ? (
        <CarteCatalogue annonces={annonces} />
      ) : (
        <ul
          className={cn(
            'grid gap-6 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
            recherche.isFetching && 'opacity-60',
          )}
        >
          {annonces.map((a, i) => (
            <Revele key={a.id} as="li" delai={delaiCinema(i % 4, 0.1)}>
              <CarteAnnonce annonce={a} />
            </Revele>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pages du catalogue">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} sur {pages}
          </span>
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </nav>
      )}
    </section>
  )
}
