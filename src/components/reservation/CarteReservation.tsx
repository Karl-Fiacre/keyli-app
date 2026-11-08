import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, CalendarDays, Home, MessageSquare, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useAnnulerReservation, useRepondreReservation, type Reservation } from '@/partage/hooks/useReservations'
import { urlPhoto } from '@/lib/cloudinary'
import { messageErreur } from '@/partage/lib/erreurs'
import { formatXof } from '@/partage/lib/format'
import { aujourdhuiIso, formatJourCourt, pluriel } from '@/partage/lib/sejour'
import { cn } from '@/lib/utils'

// Libellé et couleur de statut (tokens : vert = accepté, orange = en
// attente, rouge = refusé, gris = annulé / expiré — DESIGN_SYSTEM.md)
function etiquette(r: Reservation): { texte: string; classe: string } {
  if (r.statut === 'demandee' && r.date_arrivee < aujourdhuiIso())
    return { texte: 'Expirée', classe: 'bg-secondary text-muted-foreground' }
  switch (r.statut) {
    case 'demandee':
      return { texte: 'En attente de l’hôte', classe: 'bg-pending/15 text-pending-texte' }
    case 'acceptee':
      return { texte: 'Acceptée', classe: 'bg-success/15 text-success-texte' }
    case 'refusee':
      return { texte: 'Refusée', classe: 'bg-destructive/10 text-destructive-texte' }
    default:
      return { texte: 'Annulée', classe: 'bg-secondary text-muted-foreground' }
  }
}

// Une réservation, vue du voyageur ou de l'hôte, avec les actions permises
// (la base revérifie chaque action : repondre/annuler_reservation_keyli)
export function CarteReservation({
  reservation: r,
  sens,
  nomVoyageur,
}: {
  reservation: Reservation
  sens: 'voyageur' | 'hote'
  nomVoyageur?: string
}) {
  const repondre = useRepondreReservation()
  const annuler = useAnnulerReservation()
  const [saisie, setSaisie] = useState<null | 'refus' | 'annulation'>(null)
  const [motif, setMotif] = useState('')
  const e = etiquette(r)
  const avenir = r.date_arrivee >= aujourdhuiIso()
  const annonce = r.properties_keyli
  const interlocuteur = sens === 'voyageur' ? r.owner_id : r.voyageur_id
  const erreur = repondre.error ?? annuler.error
  const enCours = repondre.isPending || annuler.isPending

  const confirmer = () => {
    if (saisie === 'refus') repondre.mutate({ id: r.id, accepter: false, motif }, { onSuccess: () => setSaisie(null) })
    if (saisie === 'annulation') annuler.mutate({ id: r.id, motif }, { onSuccess: () => setSaisie(null) })
  }

  return (
    <article className="overflow-hidden rounded-lg border bg-card shadow-sm sm:flex">
      <Link to={`/annonce/${r.property_id}`} className="block shrink-0 bg-secondary sm:w-44">
        {annonce?.main_image_url ? (
          <img
            src={urlPhoto(annonce.main_image_url, 352, 264)}
            alt=""
            loading="lazy"
            className="h-36 w-full object-cover sm:h-full"
          />
        ) : (
          <div className="flex h-36 items-center justify-center text-muted-foreground sm:h-full">
            <Home className="h-8 w-8" aria-hidden />
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1 space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/annonce/${r.property_id}`} className="line-clamp-1 font-semibold hover:underline">
              {annonce?.title ?? 'Annonce retirée'}
            </Link>
            {sens === 'hote' && nomVoyageur && (
              <p className="text-sm text-muted-foreground">Demande de {nomVoyageur}</p>
            )}
          </div>
          <span className={cn('shrink-0 rounded-pill px-3 py-1 text-xs font-semibold', e.classe)}>{e.texte}</span>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <li className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
            {formatJourCourt(r.date_arrivee)} → {formatJourCourt(r.date_depart)}
            <span className="text-muted-foreground">({pluriel(r.nuits ?? 0, 'nuit')})</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
            {pluriel(r.voyageurs, 'voyageur')}
          </li>
          {r.types_chambres_keyli && (
            <li className="flex items-center gap-1.5">
              <BedDouble className="h-4 w-4 text-muted-foreground" aria-hidden />
              {r.nb_chambres} × {r.types_chambres_keyli.nom}
            </li>
          )}
        </ul>
        <p className="text-sm">
          Total <span className="font-bold">{formatXof(Number(r.montant_total))}</span>
          <span className="text-muted-foreground"> · à régler directement avec l’hôte</span>
        </p>
        {r.message && sens === 'hote' && (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm italic">« {r.message} »</p>
        )}
        {r.motif && (r.statut === 'refusee' || r.statut === 'annulee') && (
          <p className="text-sm text-muted-foreground">Motif : {r.motif}</p>
        )}

        {erreur && <Alert variant="erreur">{messageErreur(erreur)}</Alert>}

        {saisie ? (
          <div className="space-y-2">
            <label htmlFor={`motif-${r.id}`} className="text-sm font-medium">
              {saisie === 'refus' ? 'Motif du refus (facultatif)' : 'Motif de l’annulation'}
              {saisie === 'annulation' && sens === 'hote' && <span className="text-destructive-texte"> *</span>}
            </label>
            <textarea
              id={`motif-${r.id}`}
              rows={2}
              maxLength={500}
              value={motif}
              onChange={(ev) => setMotif(ev.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" disabled={enCours} onClick={confirmer}>
                {saisie === 'refus' ? 'Refuser la demande' : 'Confirmer l’annulation'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSaisie(null)}>
                Retour
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sens === 'hote' && r.statut === 'demandee' && avenir && (
              <>
                <Button
                  size="sm"
                  variant="turquoise"
                  disabled={enCours}
                  onClick={() => repondre.mutate({ id: r.id, accepter: true })}
                >
                  Accepter
                </Button>
                <Button size="sm" variant="outline" disabled={enCours} onClick={() => setSaisie('refus')}>
                  Refuser
                </Button>
              </>
            )}
            {avenir &&
              ((sens === 'voyageur' && (r.statut === 'demandee' || r.statut === 'acceptee')) ||
                (sens === 'hote' && r.statut === 'acceptee')) && (
                <Button size="sm" variant="outline" disabled={enCours} onClick={() => setSaisie('annulation')}>
                  {r.statut === 'demandee' ? 'Retirer ma demande' : 'Annuler'}
                </Button>
              )}
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/messages/${r.property_id}/${interlocuteur}`}>
                <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden />
                {sens === 'voyageur' ? 'Écrire à l’hôte' : 'Écrire au voyageur'}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
