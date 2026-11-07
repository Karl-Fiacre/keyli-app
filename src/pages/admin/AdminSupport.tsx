import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  LIBELLES_STATUT_SUPPORT,
  LIBELLES_SUJET_SUPPORT,
  useDemandesSupport,
  useSuiviSupport,
  type StatutSupport,
} from '@/hooks/useSupport'
import { messageErreur } from '@/lib/erreurs'
import { formatDate } from '@/lib/format'
import type { SujetSupport } from '@/lib/validation'

const FILTRES: StatutSupport[] = ['nouvelle', 'en_cours', 'traitee', 'classee']

// Demandes d'aide envoyées depuis la page Aide (Sprint 7), visiteurs
// compris. L'équipe répond par email depuis sa messagerie (bouton
// « Répondre »), puis note ce qui a été fait et change le statut.
export default function AdminSupport() {
  const [statut, setStatut] = useState<StatutSupport>('nouvelle')
  const file = useDemandesSupport(statut)
  const suivi = useSuiviSupport()
  const [notes, setNotes] = useState<Record<string, string>>({})

  const enregistrer = (id: string, nouveauStatut: StatutSupport, noteActuelle: string | null) =>
    suivi.mutate({ id, statut: nouveauStatut, note: notes[id] ?? noteActuelle ?? '' })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Statut des demandes">
        {FILTRES.map((v) => (
          <Button
            key={v}
            size="sm"
            variant={statut === v ? 'default' : 'outline'}
            role="tab"
            aria-selected={statut === v}
            onClick={() => setStatut(v)}
          >
            {LIBELLES_STATUT_SUPPORT[v]}
          </Button>
        ))}
      </div>

      {suivi.isError && <Alert variant="erreur">{messageErreur(suivi.error)}</Alert>}
      {file.isPending && <p className="text-muted-foreground">Chargement…</p>}
      {file.isError && <Alert variant="erreur">{messageErreur(file.error)}</Alert>}
      {file.data?.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune demande dans cette catégorie.
        </p>
      )}

      <ul className="space-y-4">
        {file.data?.map((d) => {
          const id = `note-${d.id}`
          const sujet = LIBELLES_SUJET_SUPPORT[d.sujet as SujetSupport] ?? d.sujet
          const objet = encodeURIComponent(`Keyli — ${sujet}`)
          return (
            <li key={d.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{sujet}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(d.created_at)} · {d.nom} ({d.email}) · {d.user_id ? 'compte Keyli' : 'visiteur'}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${d.email}?subject=${objet}`}>
                    <Mail className="h-4 w-4" aria-hidden />
                    Répondre
                  </a>
                </Button>
              </div>
              <p className="whitespace-pre-line text-sm">{d.message}</p>
              <div className="space-y-2">
                <label htmlFor={id} className="text-sm font-medium">
                  Note interne
                </label>
                <textarea
                  id={id}
                  rows={2}
                  maxLength={2000}
                  value={notes[d.id] ?? d.note_admin ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">Visible par l’équipe seulement.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {statut !== 'traitee' && (
                  <Button
                    size="sm"
                    disabled={suivi.isPending}
                    onClick={() => enregistrer(d.id, 'traitee', d.note_admin)}
                  >
                    Marquer traitée
                  </Button>
                )}
                {statut !== 'en_cours' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={suivi.isPending}
                    onClick={() => enregistrer(d.id, 'en_cours', d.note_admin)}
                  >
                    En cours
                  </Button>
                )}
                {statut !== 'classee' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={suivi.isPending}
                    onClick={() => enregistrer(d.id, 'classee', d.note_admin)}
                  >
                    Classer
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
