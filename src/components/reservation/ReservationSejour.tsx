import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { BedDouble, CalendarDays, Minus, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { CalendrierSejour } from '@/components/reservation/CalendrierSejour'
import { useSession } from '@/hooks/useSession'
import { useDemanderReservation, useDevisSejour, useNuitsCompletes, useTypesChambres } from '@/hooks/useReservations'
import { messageErreur } from '@/lib/erreurs'
import { formatXof } from '@/lib/format'
import { ajouterJours, aujourdhuiIso, formatJourCourt, isoJour, isoValide, jourDepuisIso, pluriel } from '@/lib/sejour'
import { cn } from '@/lib/utils'

interface Props {
  propertyId: string
  hotelier: boolean
  prixNuit: number
  nuitsMin: number
  voyageursMax: number | null
  estProprietaire: boolean
}

// Carte de réservation de la fiche (séjours courts) : type de chambre pour
// un hôtel, dates sur calendrier, voyageurs, devis calculé par la base, puis
// demande envoyée à l'hôte. Les dates viennent de l'URL si la recherche les
// a fixées (?arrivee=…&depart=…&voyageurs=…).
export function ReservationSejour({ propertyId, hotelier, prixNuit, nuitsMin, voyageursMax, estProprietaire }: Props) {
  const { session } = useSession()
  const emplacement = useLocation()
  const [parametres] = useSearchParams()
  const arriveeUrl = parametres.get('arrivee')
  const departUrl = parametres.get('depart')
  const [arrivee, setArrivee] = useState<string | null>(
    isoValide(arriveeUrl) && arriveeUrl >= aujourdhuiIso() ? arriveeUrl : null,
  )
  const [depart, setDepart] = useState<string | null>(
    arrivee && isoValide(departUrl) && departUrl > arrivee ? departUrl : null,
  )
  const [voyageurs, setVoyageurs] = useState(() => Math.max(1, Number(parametres.get('voyageurs')) || 1))
  const [chambres, setChambres] = useState(1)
  const [chambreId, setChambreId] = useState<string | null>(null)
  const [calendrierOuvert, setCalendrierOuvert] = useState(!arrivee)
  const [message, setMessage] = useState('')
  const [moisVu, setMoisVu] = useState(() => {
    const d = jourDepuisIso(arrivee ?? aujourdhuiIso())
    return isoJour(new Date(d.getFullYear(), d.getMonth(), 1))
  })

  const typesChambres = useTypesChambres(hotelier ? propertyId : undefined)
  const chambre = typesChambres.data?.find((c) => c.id === chambreId) ?? null
  // Premier type de chambre compatible choisi d'office
  useEffect(() => {
    if (hotelier && !chambreId && typesChambres.data?.length) setChambreId(typesChambres.data[0].id)
  }, [hotelier, chambreId, typesChambres.data])

  const completes = useNuitsCompletes(propertyId, chambreId, moisVu, ajouterJours(moisVu, 62), !hotelier || !!chambreId)
  const parametresSejour = { propertyId, chambreId, arrivee, depart, voyageurs, chambres }
  const devis = useDevisSejour(parametresSejour, !hotelier || !!chambreId)
  const demande = useDemanderReservation()

  const capaciteVoyageurs = hotelier ? (chambre ? chambre.voyageurs_max * chambres : 1) : (voyageursMax ?? 50)
  const prixAffiche = hotelier ? Number(chambre?.prix_nuit ?? prixNuit) : prixNuit
  const d = devis.data
  const reservable = !!arrivee && !!depart && !!d && !d.motif

  if (hotelier && typesChambres.isSuccess && typesChambres.data.length === 0) {
    return (
      <Cadre prix={prixNuit} aPartirDe>
        <p className="text-sm text-muted-foreground">
          Les chambres de cet établissement ne sont pas encore ouvertes à la réservation. Écrivez à l’hôte ci-dessous.
        </p>
      </Cadre>
    )
  }

  if (demande.isSuccess) {
    return (
      <Cadre prix={prixAffiche}>
        <Alert variant="succes">
          Demande envoyée ! L’hôte vous répond dans les meilleurs délais : suivez-la dans{' '}
          <Link to="/reservations" className="font-semibold underline">
            Mes réservations
          </Link>
          . Les nuits sont bloquées pour vous dès qu’il accepte.
        </Alert>
      </Cadre>
    )
  }

  return (
    <Cadre prix={prixAffiche} aPartirDe={hotelier && !chambre}>
      <div className="space-y-4">
        {hotelier && (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Type de chambre</legend>
            {typesChambres.data?.map((c) => (
              <label
                key={c.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors duration-150',
                  chambreId === c.id ? 'border-primary bg-secondary' : 'hover:bg-secondary/60',
                )}
              >
                <input
                  type="radio"
                  name="type-chambre"
                  className="mt-1 accent-[hsl(var(--primary))]"
                  checked={chambreId === c.id}
                  onChange={() => {
                    setChambreId(c.id)
                    setChambres(1)
                    setVoyageurs((v) => Math.min(v, c.voyageurs_max))
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 font-semibold">
                    {c.nom}
                    <span className="shrink-0">{formatXof(Number(c.prix_nuit))}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {pluriel(c.voyageurs_max, 'voyageur')} max · par nuit
                  </span>
                  {c.description && <span className="mt-1 block text-xs text-muted-foreground">{c.description}</span>}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {/* Dates */}
        <div>
          <button
            type="button"
            onClick={() => setCalendrierOuvert((o) => !o)}
            aria-expanded={calendrierOuvert}
            className="grid w-full grid-cols-2 overflow-hidden rounded-lg border text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="border-r p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Arrivée
              </span>
              <span className="font-medium">{arrivee ? formatJourCourt(arrivee) : 'Ajouter'}</span>
            </span>
            <span className="p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Départ
              </span>
              <span className="font-medium">{depart ? formatJourCourt(depart) : 'Ajouter'}</span>
            </span>
          </button>
          {calendrierOuvert && (
            <div className="kf-panneau-ouvre mt-3 rounded-lg border p-3">
              <CalendrierSejour
                arrivee={arrivee}
                depart={depart}
                deuxMois={false}
                completes={completes.data}
                onMoisChange={setMoisVu}
                onChange={(a, dep) => {
                  setArrivee(a)
                  setDepart(dep)
                  if (a && dep) setCalendrierOuvert(false)
                }}
              />
            </div>
          )}
          {nuitsMin > 1 && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              Séjour de {pluriel(nuitsMin, 'nuit')} minimum
            </p>
          )}
        </div>

        <Compteur
          libelle="Voyageurs"
          icone={Users}
          valeur={voyageurs}
          min={1}
          max={capaciteVoyageurs}
          onChange={setVoyageurs}
        />
        {hotelier && chambre && chambre.quantite > 1 && (
          <Compteur
            libelle="Chambres"
            icone={BedDouble}
            valeur={chambres}
            min={1}
            max={chambre.quantite}
            onChange={setChambres}
          />
        )}

        {/* Devis de la base */}
        {arrivee && depart && d && (
          <div className="space-y-2 border-t pt-3 text-sm" aria-live="polite">
            {d.nuits && d.prix_nuit && (
              <p className="flex justify-between text-muted-foreground">
                <span>
                  {formatXof(Number(d.prix_nuit))} × {pluriel(d.nuits, 'nuit')}
                  {chambres > 1 && ` × ${chambres} chambres`}
                </span>
                {d.montant_total && <span>{formatXof(Number(d.montant_total))}</span>}
              </p>
            )}
            {d.motif ? (
              <Alert variant="erreur">{d.motif}</Alert>
            ) : (
              <p className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatXof(Number(d.montant_total))}</span>
              </p>
            )}
          </div>
        )}

        {estProprietaire ? (
          <p className="text-sm text-muted-foreground">
            C’est votre annonce : les demandes arrivent dans Réservations.
          </p>
        ) : !session ? (
          <Button asChild className="w-full" size="lg" variant="turquoise">
            <Link to="/connexion" state={{ depuis: emplacement.pathname + emplacement.search }}>
              Se connecter pour réserver
            </Link>
          </Button>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (reservable) demande.mutate({ ...parametresSejour, message: message.trim() })
            }}
          >
            {reservable && (
              <div className="space-y-1">
                <label htmlFor="message-reservation" className="text-sm font-medium">
                  Message à l’hôte <span className="font-normal text-muted-foreground">(facultatif)</span>
                </label>
                <textarea
                  id="message-reservation"
                  rows={3}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Heure d’arrivée prévue, motif du séjour…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}
            {demande.isError && <Alert variant="erreur">{messageErreur(demande.error)}</Alert>}
            <Button
              type="submit"
              size="lg"
              variant="turquoise"
              className="w-full"
              disabled={!reservable || demande.isPending}
            >
              {demande.isPending ? 'Envoi…' : !arrivee || !depart ? 'Choisissez vos dates' : 'Demander à réserver'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Aucun paiement maintenant : vous réglez directement avec l’hôte après son accord.
            </p>
          </form>
        )}
      </div>
    </Cadre>
  )
}

function Cadre({ prix, aPartirDe, children }: { prix: number; aPartirDe?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-accueil border bg-card p-5 shadow-card">
      <p className="mb-4 text-sm text-muted-foreground">
        {aPartirDe && 'À partir de '}
        <span className="text-2xl font-bold text-foreground">{formatXof(prix)}</span> / nuit
      </p>
      {children}
    </div>
  )
}

function Compteur({
  libelle,
  icone: Icone,
  valeur,
  min,
  max,
  onChange,
}: {
  libelle: string
  icone: typeof Users
  valeur: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icone className="h-4 w-4 text-muted-foreground" aria-hidden />
        {libelle}
      </span>
      <span className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 rounded-full p-0"
          aria-label={`Moins de ${libelle.toLowerCase()}`}
          disabled={valeur <= min}
          onClick={() => onChange(valeur - 1)}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <span className="w-6 text-center font-semibold" aria-live="polite">
          {valeur}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 rounded-full p-0"
          aria-label={`Plus de ${libelle.toLowerCase()}`}
          disabled={valeur >= max}
          onClick={() => onChange(valeur + 1)}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </span>
    </div>
  )
}
