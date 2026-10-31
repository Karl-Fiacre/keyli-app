import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CarteAnnonce } from '@/components/annonce/CarteAnnonce'
import { useBasculerFavori, useMesFavoris } from '@/hooks/useFavoris'
import { messageErreur } from '@/lib/erreurs'
import { formatDate } from '@/lib/format'

// Annonces mises en favori, de la plus récente à la plus ancienne. Une annonce
// retirée depuis (archivée, masquée) reste listée pour pouvoir l'enlever.
export default function MesFavoris() {
  const favoris = useMesFavoris()
  const bascule = useBasculerFavori()
  const disponibles = (favoris.data ?? []).filter((f) => f.annonce)
  const retirees = (favoris.data ?? []).filter((f) => !f.annonce)

  return (
    <section>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes favoris</h1>
          {favoris.data && (
            <p className="text-sm text-muted-foreground">
              {disponibles.length} annonce{disponibles.length > 1 ? 's' : ''} enregistrée
              {disponibles.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {favoris.isPending && <p className="text-muted-foreground">Chargement…</p>}
        {favoris.isError && <Alert variant="erreur">{messageErreur(favoris.error)}</Alert>}

        {favoris.data?.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <Heart className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium">Aucun favori pour l'instant.</p>
            <p className="mt-1 text-sm text-muted-foreground">Touchez le cœur d'une annonce pour la retrouver ici.</p>
            <Button asChild className="mt-5">
              <Link to="/recherche">Voir les logements</Link>
            </Button>
          </div>
        )}

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {disponibles.map((f) => (
            <li key={f.propertyId}>{f.annonce && <CarteAnnonce annonce={f.annonce} source="lien_direct" />}</li>
          ))}
        </ul>

        {retirees.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Plus disponibles</h2>
            <ul className="space-y-2">
              {retirees.map((f) => (
                <li
                  key={f.propertyId}
                  className="flex items-center justify-between gap-3 rounded-lg border p-4 text-sm"
                >
                  <span className="text-muted-foreground">
                    Annonce retirée par son annonceur{f.ajouteLe ? ` (ajoutée le ${formatDate(f.ajouteLe)})` : ''}
                  </span>
                  <Button
                    variant="outline"
                    disabled={bascule.isPending}
                    onClick={() => bascule.mutate({ propertyId: f.propertyId, actif: true })}
                  >
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
