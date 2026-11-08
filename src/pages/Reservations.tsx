import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CarteReservation } from '@/components/reservation/CarteReservation'
import { useProfil } from '@/partage/hooks/useProfil'
import { useNomsVoyageurs, useReservations, type Reservation } from '@/partage/hooks/useReservations'
import { messageErreur } from '@/partage/lib/erreurs'
import { aujourdhuiIso } from '@/partage/lib/sejour'
import { cn } from '@/lib/utils'
import { TexteCinema } from '@/components/animation/TexteCinema'

// Réservations : « Mes séjours » (tout compte) et « Demandes reçues »
// (propriétaires et agences). À venir d'abord, puis l'historique.
export default function Reservations() {
  const role = useProfil().data?.role_keyli
  const hote = role === 'owner' || role === 'agency'
  const [onglet, setOnglet] = useState<'voyageur' | 'hote'>('voyageur')
  const sens = hote ? onglet : 'voyageur'
  const recues = useReservations('hote')
  const enAttente = (recues.data ?? []).filter((r) => r.statut === 'demandee' && r.date_arrivee >= aujourdhuiIso())

  return (
    <section className="container max-w-4xl py-8 md:py-12">
      <TexteCinema className="font-titre text-3xl font-bold" segments={[{ texte: 'Réservations' }]} />
      <p className="mt-1 text-muted-foreground">Séjours courts : demandes, réponses des hôtes et nuits confirmées.</p>

      {hote && (
        <div className="mt-6 inline-flex rounded-pill bg-secondary p-1" role="tablist">
          {(
            [
              ['voyageur', 'Mes séjours'],
              ['hote', 'Demandes reçues'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              role="tab"
              aria-selected={onglet === v}
              onClick={() => setOnglet(v)}
              className={cn(
                'rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors duration-150',
                onglet === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {l}
              {v === 'hote' && enAttente.length > 0 && (
                <span className="ml-2 rounded-pill bg-pending px-1.5 py-0.5 text-[11px] text-primary-foreground">
                  {enAttente.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <Liste sens={sens} />
    </section>
  )
}

function Liste({ sens }: { sens: 'voyageur' | 'hote' }) {
  const reservations = useReservations(sens)
  const liste = reservations.data ?? []
  const noms = useNomsVoyageurs(sens === 'hote' ? [...new Set(liste.map((r) => r.voyageur_id))] : [])
  const aujourdhui = aujourdhuiIso()
  const actives = (r: Reservation) =>
    r.date_depart >= aujourdhui && (r.statut === 'demandee' || r.statut === 'acceptee')
  const aVenir = liste.filter(actives)
  const historique = liste.filter((r) => !actives(r)).reverse()

  if (reservations.isPending) return <p className="mt-8 text-muted-foreground">Chargement…</p>
  if (reservations.isError)
    return (
      <Alert variant="erreur" className="mt-8">
        {messageErreur(reservations.error)}
      </Alert>
    )

  if (liste.length === 0) {
    return (
      <div className="mt-10 rounded-accueil border border-dashed p-10 text-center">
        <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="mt-3 font-semibold">
          {sens === 'voyageur' ? 'Aucune réservation pour le moment' : 'Aucune demande reçue pour le moment'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {sens === 'voyageur'
            ? 'Hôtels, auberges, résidences meublées : choisissez vos dates et réservez en quelques clics.'
            : 'Les demandes de vos séjours courts arriveront ici. Pour un hôtel, ajoutez vos chambres dans Mes annonces.'}
        </p>
        {sens === 'voyageur' && (
          <Button asChild variant="turquoise" className="mt-5">
            <Link to="/recherche?sejour=1">Trouver un séjour</Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-8">
      {aVenir.length > 0 && (
        <Bloc titre="À venir">
          {aVenir.map((r) => (
            <CarteReservation key={r.id} reservation={r} sens={sens} nomVoyageur={noms.data?.get(r.voyageur_id)} />
          ))}
        </Bloc>
      )}
      {historique.length > 0 && (
        <Bloc titre="Historique">
          {historique.map((r) => (
            <CarteReservation key={r.id} reservation={r} sens={sens} nomVoyageur={noms.data?.get(r.voyageur_id)} />
          ))}
        </Bloc>
      )}
    </div>
  )
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{titre}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
