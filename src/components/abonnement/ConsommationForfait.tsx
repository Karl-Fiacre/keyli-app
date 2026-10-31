import type { CSSProperties } from 'react'
import { formatXof } from '@/lib/format'
import { cn } from '@/lib/utils'

// Consommation du forfait sur le cycle mensuel en cours : mises en ligne du
// cycle face au seuil, valeurs calculées par la base (etat_publication_keyli,
// cycle_abonnement_keyli) — l'écran ne fait qu'afficher.
export function ConsommationForfait({
  forfait,
  publications,
  seuil,
  prixDepassement,
  finCycle,
  finAbonnement,
}: {
  forfait: string
  publications: number
  seuil: number | null // NULL = pas de plafond
  prixDepassement: number | null
  finCycle: string | null
  finAbonnement: string
}) {
  const ratio = seuil ? publications / seuil : 0
  const depasse = seuil !== null && publications > seuil
  const couleur = depasse ? 'bg-destructive' : ratio >= 0.8 ? 'bg-pending' : 'bg-success'
  const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  return (
    <section className="space-y-3 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Consommation du mois</h2>
        <p className="text-xs text-muted-foreground">
          {finCycle ? `Le compteur repart le ${date(finCycle)}` : null}
          {finCycle && ' · '}Abonnement jusqu'au {date(finAbonnement)}
        </p>
      </div>
      <p className="text-sm">
        <strong className="text-2xl tabular-nums">{publications}</strong>
        {seuil !== null ? (
          <span className="text-muted-foreground">
            {' '}
            / {seuil} annonces mises en ligne ce mois-ci — forfait {forfait}
          </span>
        ) : (
          <span className="text-muted-foreground"> annonces mises en ligne ce mois-ci — forfait {forfait}</span>
        )}
      </p>
      {seuil !== null && (
        <div
          className="h-2 overflow-hidden rounded-pill bg-secondary"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={seuil}
          aria-valuenow={publications}
          aria-label="Annonces mises en ligne ce mois-ci"
        >
          <div
            className={cn('kf-barre h-full rounded-pill', couleur)}
            style={{ width: `${Math.min(100, ratio * 100)}%` } as CSSProperties}
          />
        </div>
      )}
      {depasse && prixDepassement !== null && (
        <p className="text-xs text-muted-foreground">
          {publications - (seuil ?? 0)} annonce{publications - (seuil ?? 0) > 1 ? 's' : ''} au-delà du seuil :{' '}
          {formatXof(prixDepassement)} chacune, ajoutés à votre prochain paiement.
        </p>
      )}
      {!depasse && seuil !== null && ratio >= 0.8 && (
        <p className="text-xs text-muted-foreground">Vous approchez du seuil de votre forfait.</p>
      )}
    </section>
  )
}
