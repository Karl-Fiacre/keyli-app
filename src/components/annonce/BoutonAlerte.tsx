import { Link, useLocation } from 'react-router-dom'
import { Bell, BellRing, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'
import { useMesAlertes } from '@/hooks/useTableauDeBord'
import { useBasculerAlerte, useCreerAlerte } from '@/hooks/useAlertes'
import type { FiltresRecherche } from '@/hooks/useRecherche'
import { criteresAlerte, memesCriteres } from '@/lib/recherche'
import { messageErreur } from '@/lib/erreurs'

// « Créer une alerte » depuis la page Recherche : enregistre les filtres en
// cours (hors équipements et tri). La base notifie ensuite le compte à
// chaque nouvelle annonce correspondante (au plus 10 par jour et par alerte).
export function BoutonAlerte({ filtres }: { filtres: FiltresRecherche }) {
  const { session } = useSession()
  const emplacement = useLocation()
  const alertes = useMesAlertes()
  const creer = useCreerAlerte()
  const basculer = useBasculerAlerte()

  const criteres = criteresAlerte(filtres)
  const vide = Object.keys(criteres).length === 0
  const existante = (alertes.data ?? []).find((a) =>
    memesCriteres(a.criteres as Record<string, unknown>, criteres as Record<string, unknown>),
  )

  if (!session) {
    return (
      <Button variant="outline" asChild>
        <Link to="/connexion" state={{ depuis: emplacement.pathname + emplacement.search }}>
          <Bell className="mr-2 h-4 w-4" aria-hidden />
          Créer une alerte
        </Link>
      </Button>
    )
  }

  const erreur = creer.error ?? basculer.error
  return (
    <div className="flex flex-col items-start gap-1">
      {existante?.actif ? (
        <Button variant="outline" disabled>
          <Check className="mr-2 h-4 w-4" aria-hidden />
          Alerte active
        </Button>
      ) : existante ? (
        <Button
          variant="outline"
          disabled={basculer.isPending}
          onClick={() => basculer.mutate({ id: existante.id, actif: true })}
        >
          <BellRing className="mr-2 h-4 w-4" aria-hidden />
          Réactiver l'alerte
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={vide || creer.isPending || alertes.isPending}
          title={vide ? 'Choisissez au moins un filtre pour créer une alerte' : undefined}
          onClick={() => creer.mutate(criteres)}
        >
          <Bell className="mr-2 h-4 w-4" aria-hidden />
          {creer.isPending ? 'Création…' : 'Créer une alerte'}
        </Button>
      )}
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {erreur
          ? null
          : creer.isSuccess && existante?.actif
            ? 'Vous serez prévenu à chaque nouvelle annonce correspondante.'
            : vide
              ? filtres.avantages.length > 0
                ? 'Les équipements ne suffisent pas : ajoutez un lieu, un type ou un prix.'
                : 'Choisissez au moins un filtre pour créer une alerte.'
              : !existante && filtres.avantages.length > 0
                ? "Les équipements choisis ne sont pas pris en compte par l'alerte."
                : null}
      </p>
      {erreur && <p className="text-xs text-destructive-texte">{messageErreur(erreur)}</p>}
    </div>
  )
}
