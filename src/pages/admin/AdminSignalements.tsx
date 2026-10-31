import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useFileSignalements, useModeration, type StatutSignalement } from '@/hooks/useAdmin'
import { MOTIFS_SIGNALEMENT } from '@/hooks/useVerification'
import { messageErreur } from '@/lib/erreurs'
import { formatDate } from '@/lib/format'

const FILTRES: Array<[StatutSignalement, string]> = [
  ['pending', 'En attente'],
  ['reviewed', 'Examinés'],
  ['resolved', 'Résolus'],
]
const LIBELLES_MOTIF = Object.fromEntries(MOTIFS_SIGNALEMENT) as Record<string, string>

type Action = { id: string; type: 'retrait' | 'suspension' | 'resolution'; texte: string }

// File de modération (docs/MODULES/admin.md) : chaque action passe par une
// fonction SQL auditée ; retrait de vérification et suspension exigent un motif.
export default function AdminSignalements() {
  const [statut, setStatut] = useState<StatutSignalement>('pending')
  const file = useFileSignalements(statut)
  const { traiter, retirerVerificationBien, suspendre } = useModeration()
  const [action, setAction] = useState<Action | null>(null)
  const erreur = traiter.error ?? retirerVerificationBien.error ?? suspendre.error
  const enCours = traiter.isPending || retirerVerificationBien.isPending || suspendre.isPending

  const confirmer = (s: { id: string; property_id: string | null; annonceur_id: string | null }) => {
    if (!action) return
    const fini = { onSuccess: () => setAction(null) }
    if (action.type === 'resolution') traiter.mutate({ id: s.id, statut: 'resolved', note: action.texte }, fini)
    else if (action.type === 'retrait' && s.property_id)
      retirerVerificationBien.mutate({ propertyId: s.property_id, motif: action.texte }, fini)
    else if (action.type === 'suspension' && s.annonceur_id)
      suspendre.mutate({ userId: s.annonceur_id, motif: action.texte }, fini)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Statut des signalements">
        {FILTRES.map(([v, l]) => (
          <Button
            key={v}
            size="sm"
            variant={statut === v ? 'default' : 'outline'}
            role="tab"
            aria-selected={statut === v}
            onClick={() => setStatut(v)}
          >
            {l}
          </Button>
        ))}
      </div>

      {erreur && <Alert variant="erreur">{messageErreur(erreur)}</Alert>}
      {file.isPending && <p className="text-muted-foreground">Chargement…</p>}
      {file.isError && <Alert variant="erreur">{messageErreur(file.error)}</Alert>}
      {file.data?.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {statut === 'pending' ? 'Aucun signalement en attente.' : 'Aucun signalement.'}
        </p>
      )}

      <ul className="space-y-3">
        {file.data?.map((s) => (
          <li key={s.id} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold">{LIBELLES_MOTIF[s.motif] ?? s.motif}</p>
                {s.precision_texte && <p className="whitespace-pre-line text-sm">« {s.precision_texte} »</p>}
                <p className="text-xs text-muted-foreground">
                  Signalé le {formatDate(s.signale_le ?? '')} par {s.auteur ?? 'un membre'}
                </p>
              </div>
              {Number(s.signalements_en_attente) > 1 && (
                <span className="rounded-pill bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive-texte">
                  {Number(s.signalements_en_attente)} signalements en attente sur cette annonce
                </span>
              )}
            </div>

            <div className="rounded-lg bg-secondary/50 p-3 text-sm">
              {s.property_id ? (
                <Link to={`/annonce/${s.property_id}`} className="font-medium text-primary-glow hover:underline">
                  {s.titre_bien ?? 'Annonce'}
                </Link>
              ) : (
                <span>Signalement sans annonce</span>
              )}
              <span className="text-muted-foreground">
                {' '}
                · {s.annonceur ?? '—'}
                {s.bien_verifie && ' · bien vérifié'}
                {s.bien_archive && ' · archivée'}
                {s.annonceur_suspendu && ' · annonceur suspendu'}
              </span>
            </div>

            {statut !== 'resolved' &&
              (action?.id === s.id ? (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (action.type === 'resolution' || action.texte.trim()) confirmer(s)
                  }}
                >
                  <label className="block space-y-1">
                    <span className="text-xs font-medium">
                      {action.type === 'resolution'
                        ? "Note de traitement (facultative, journal d'audit)"
                        : action.type === 'retrait'
                          ? "Motif du retrait de vérification (envoyé à l'annonceur)"
                          : "Motif de la suspension (envoyé à l'annonceur)"}
                    </span>
                    <textarea
                      rows={2}
                      value={action.texte}
                      aria-label={
                        action.type === 'resolution'
                          ? 'Note de traitement'
                          : action.type === 'retrait'
                            ? 'Motif du retrait de vérification'
                            : 'Motif de la suspension'
                      }
                      onChange={(e) => setAction({ ...action, texte: e.target.value })}
                      className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      variant={action.type === 'resolution' ? 'default' : 'destructive'}
                      disabled={enCours || (action.type !== 'resolution' && !action.texte.trim())}
                    >
                      Confirmer
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAction(null)}>
                      Annuler
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {statut === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={enCours}
                      onClick={() => traiter.mutate({ id: s.id, statut: 'reviewed' })}
                    >
                      Marquer examiné
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setAction({ id: s.id, type: 'resolution', texte: '' })}>
                    Résoudre…
                  </Button>
                  {s.bien_verifie && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAction({ id: s.id, type: 'retrait', texte: '' })}
                    >
                      Retirer la vérification du bien…
                    </Button>
                  )}
                  {s.annonceur_id && !s.annonceur_suspendu && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAction({ id: s.id, type: 'suspension', texte: '' })}
                    >
                      Suspendre l'annonceur…
                    </Button>
                  )}
                </div>
              ))}
          </li>
        ))}
      </ul>
    </div>
  )
}
