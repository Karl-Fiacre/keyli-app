import { useState } from 'react'
import { CalendarCheck, CalendarClock, CalendarX, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { FormulaireAvis } from '@/components/avis/FormulaireAvis'
import { useSession } from '@/hooks/useSession'
import {
  useMettreAJourVisite,
  useMonAvis,
  usePeutNoter,
  usePlanifierVisite,
  useProprietaireAnnonce,
  useVisitesConversation,
  type StatutVisite,
} from '@/hooks/useVisites'
import { messageErreur } from '@/lib/erreurs'
import { cn } from '@/lib/utils'

const LIBELLES: Record<StatutVisite, string> = { planifiee: 'Planifiée', effectuee: 'Effectuée', annulee: 'Annulée' }
const STYLES: Record<StatutVisite, string> = {
  planifiee: 'bg-pending/15 text-pending',
  effectuee: 'bg-success/15 text-success',
  annulee: 'bg-muted text-muted-foreground',
}

const quand = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

// Valeur d'un champ date-heure local (« 2026-10-31T10:00 »), dans 1 h par défaut
function champDateHeure(d: Date) {
  const decale = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
  return decale.toISOString().slice(0, 16)
}

// Visites et avis d'une conversation. Le propriétaire de l'annonce planifie,
// déplace, marque effectuée ou annule ; le visiteur suit ses visites. Après
// une visite effectuée (ou un lead conclu), chacun peut noter l'autre.
export function PanneauVisite({
  propertyId,
  interlocuteur,
  nomInterlocuteur,
}: {
  propertyId: string
  interlocuteur: string
  nomInterlocuteur: string
}) {
  const { session } = useSession()
  const proprietaire = useProprietaireAnnonce(propertyId)
  const visites = useVisitesConversation(propertyId, interlocuteur)
  const peutNoter = usePeutNoter(propertyId, interlocuteur)
  const monAvis = useMonAvis(propertyId, interlocuteur)
  const planifier = usePlanifierVisite()
  const majVisite = useMettreAJourVisite()
  const [formulaire, setFormulaire] = useState<'planifier' | 'avis' | { deplacer: string } | null>(null)
  const [dateHeure, setDateHeure] = useState(() => champDateHeure(new Date(Date.now() + 24 * 3600_000)))

  const estProprietaire = !!session && proprietaire.data === session.user.id
  const liste = visites.data ?? []
  const erreur = planifier.error ?? majVisite.error

  const envoyerDate = () => {
    const d = new Date(dateHeure)
    if (Number.isNaN(d.getTime())) return
    if (formulaire === 'planifier') {
      planifier.mutate({ propertyId, visiteur: interlocuteur, quand: d }, { onSuccess: () => setFormulaire(null) })
    } else if (formulaire && typeof formulaire === 'object') {
      majVisite.mutate({ id: formulaire.deplacer, quand: d }, { onSuccess: () => setFormulaire(null) })
    }
  }

  // Rien à montrer à un chercheur sans visite ni avis possible
  if (!estProprietaire && liste.length === 0 && !peutNoter.data) return null

  return (
    <div className="space-y-3 border-b bg-secondary/40 p-3 text-sm">
      {liste.map((v) => {
        const passee = new Date(v.scheduled_at) <= new Date()
        const statut = v.status ?? 'planifiee'
        return (
          <div key={v.id} className="flex flex-wrap items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="first-letter:uppercase">Visite : {quand(v.scheduled_at)}</span>
            <span className={cn('rounded-pill px-2 py-0.5 text-xs font-semibold', STYLES[statut])}>{LIBELLES[statut]}</span>
            {estProprietaire && statut === 'planifiee' && (
              <span className="ml-auto flex flex-wrap gap-1">
                {passee ? (
                  <Button size="sm" variant="outline" disabled={majVisite.isPending}
                    onClick={() => majVisite.mutate({ id: v.id, statut: 'effectuee' })}>
                    <CalendarCheck className="mr-1 h-4 w-4" aria-hidden />
                    Visite effectuée
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setFormulaire({ deplacer: v.id })}>
                    Déplacer
                  </Button>
                )}
                <Button size="sm" variant="ghost" disabled={majVisite.isPending}
                  onClick={() => majVisite.mutate({ id: v.id, statut: 'annulee' })}>
                  <CalendarX className="mr-1 h-4 w-4" aria-hidden />
                  Annuler
                </Button>
              </span>
            )}
          </div>
        )
      })}

      {formulaire === 'planifier' || (formulaire && typeof formulaire === 'object') ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            envoyerDate()
          }}
        >
          <label className="space-y-1">
            <span className="block text-xs font-medium">
              {formulaire === 'planifier' ? 'Date et heure de la visite' : 'Nouvelle date et heure'}
            </span>
            <input
              type="datetime-local"
              required
              min={champDateHeure(new Date())}
              value={dateHeure}
              onChange={(e) => setDateHeure(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            />
          </label>
          <Button type="submit" size="sm" disabled={planifier.isPending || majVisite.isPending}>
            Confirmer
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setFormulaire(null)}>
            Annuler
          </Button>
        </form>
      ) : formulaire === 'avis' ? (
        <FormulaireAvis propertyId={propertyId} note={interlocuteur} nomNote={nomInterlocuteur} onFini={() => setFormulaire(null)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {estProprietaire && (
            <Button size="sm" variant="outline" onClick={() => setFormulaire('planifier')}>
              <CalendarClock className="mr-1 h-4 w-4" aria-hidden />
              Planifier une visite
            </Button>
          )}
          {peutNoter.data && (
            <Button size="sm" variant="outline" onClick={() => setFormulaire('avis')}>
              <Star className="mr-1 h-4 w-4" aria-hidden />
              {monAvis.data ? 'Modifier mon avis' : 'Donner mon avis'}
            </Button>
          )}
        </div>
      )}

      {erreur && <Alert variant="erreur">{messageErreur(erreur)}</Alert>}
    </div>
  )
}
