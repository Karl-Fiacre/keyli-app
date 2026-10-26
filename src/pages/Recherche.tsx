import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { CarteAnnonce } from '@/components/annonce/CarteAnnonce'
import { FiltresRecherche } from '@/components/annonce/FiltresRecherche'
import { TAILLE_PAGE, useRecherche, type FiltresRecherche as Filtres, type TriRecherche } from '@/hooks/useRecherche'
import { messageErreur } from '@/lib/erreurs'
import { ecrireFiltres, LIBELLES_TRI, lireFiltres, nombreFiltresActifs } from '@/lib/recherche'
import { cn } from '@/lib/utils'

// Recherche d'annonces par filtres (Sprint 2). Les filtres vivent dans l'URL ;
// la base filtre et trie (vérifiées d'abord par défaut).
export default function Recherche() {
  const [parametres, setParametres] = useSearchParams()
  const filtres = lireFiltres(parametres)
  const recherche = useRecherche(filtres)
  const [panneauOuvert, setPanneauOuvert] = useState(false)

  const appliquer = (f: Filtres) => setParametres(ecrireFiltres(f))
  const total = recherche.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / TAILLE_PAGE))
  const actifs = nombreFiltresActifs(filtres)

  return (
    <section className="container py-8 md:py-12">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filtres : colonne sur grand écran, panneau repliable sur mobile */}
        <aside className={cn('lg:block lg:w-80 lg:shrink-0', !panneauOuvert && 'hidden')}>
          <div className="rounded-lg border bg-card p-5 lg:sticky lg:top-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filtres</h2>
              <Button variant="ghost" className="lg:hidden" aria-label="Fermer les filtres" onClick={() => setPanneauOuvert(false)}>
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </div>
            <FiltresRecherche filtres={filtres} onChange={appliquer} />
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Logements à Abidjan</h1>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {recherche.isPending ? 'Recherche…' : `${total} annonce${total > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="lg:hidden"
                aria-expanded={panneauOuvert}
                onClick={() => setPanneauOuvert((o) => !o)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden />
                Filtres{actifs > 0 ? ` (${actifs})` : ''}
              </Button>
              <label className="sr-only" htmlFor="tri">
                Trier par
              </label>
              <select
                id="tri"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                value={filtres.tri}
                onChange={(e) => appliquer({ ...filtres, tri: e.target.value as TriRecherche, page: 1 })}
              >
                {Object.entries(LIBELLES_TRI).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {recherche.isError && <Alert variant="erreur">{messageErreur(recherche.error)}</Alert>}

          {recherche.data && total === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="font-medium">Aucune annonce ne correspond à ces critères.</p>
              <p className="mt-1 text-sm text-muted-foreground">Élargissez la fourchette de prix ou retirez un filtre.</p>
            </div>
          )}

          <ul className={cn('grid gap-5 sm:grid-cols-2 xl:grid-cols-3', recherche.isFetching && 'opacity-60')}>
            {recherche.data?.annonces.map((a) => (
              <li key={a.id}>
                <CarteAnnonce annonce={a} />
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav className="flex items-center justify-center gap-3" aria-label="Pages de résultats">
              <Button
                variant="outline"
                disabled={filtres.page <= 1}
                onClick={() => appliquer({ ...filtres, page: filtres.page - 1 })}
              >
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {filtres.page} sur {pages}
              </span>
              <Button
                variant="outline"
                disabled={filtres.page >= pages}
                onClick={() => appliquer({ ...filtres, page: filtres.page + 1 })}
              >
                Suivant
              </Button>
            </nav>
          )}
        </div>
      </div>
    </section>
  )
}
