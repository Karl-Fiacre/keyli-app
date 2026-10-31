import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ouvrirDocument, useFileVerification, useReviserDocument, type StatutDocument } from '@/hooks/useAdmin'
import { LIBELLES_DOCUMENT } from '@/hooks/useVerification'
import { messageErreur } from '@/lib/erreurs'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const FILTRES: Array<[StatutDocument, string]> = [
  ['pending', 'En attente'],
  ['approved', 'Approuvés'],
  ['rejected', 'Rejetés'],
]
const ROLES: Record<string, string> = { owner: 'Propriétaire', agency: 'Agence' }

// File de vérification (docs/MODULES/verification.md) : contrôle humain
// systématique, aucun rejet sans motif. Les décisions passent par la
// fonction auditée admin_reviser_document_keyli.
export default function AdminVerifications() {
  const [statut, setStatut] = useState<StatutDocument>('pending')
  const file = useFileVerification(statut)
  const reviser = useReviserDocument()
  const [rejet, setRejet] = useState<{ id: string; motif: string } | null>(null)
  const [erreurOuverture, setErreurOuverture] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Statut des documents">
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

      {(reviser.isError || erreurOuverture) && (
        <Alert variant="erreur">{erreurOuverture ?? messageErreur(reviser.error)}</Alert>
      )}
      {file.isPending && <p className="text-muted-foreground">Chargement…</p>}
      {file.isError && <Alert variant="erreur">{messageErreur(file.error)}</Alert>}
      {file.data?.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {statut === 'pending' ? 'Aucun document en attente.' : 'Aucun document.'}
        </p>
      )}

      <ul className="space-y-3">
        {file.data?.map((d) => (
          <li key={d.id} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{LIBELLES_DOCUMENT[d.doc_type]}</p>
                <p className="text-sm">
                  {d.nom}{' '}
                  <span className="text-muted-foreground">
                    · {ROLES[d.role ?? ''] ?? d.role} · {d.email}
                  </span>
                </p>
                {d.titre_bien && d.property_id && (
                  <Link to={`/annonce/${d.property_id}`} className="text-sm text-primary-glow hover:underline">
                    Bien : {d.titre_bien}
                  </Link>
                )}
                <p className="text-xs text-muted-foreground">
                  Déposé le {formatDate(d.depose_le ?? '')}
                  {d.revu_le && ` · traité le ${formatDate(d.revu_le)}`}
                  {d.compte_verifie && ' · compte déjà vérifié'}
                </p>
                {d.notes && <p className="text-xs text-destructive-texte">Motif du rejet : {d.notes}</p>}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setErreurOuverture(null)
                  ouvrirDocument(d.fichier).catch(() => setErreurOuverture("Impossible d'ouvrir ce document."))
                }}
              >
                <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
                Ouvrir le document
              </Button>
            </div>

            {statut === 'pending' &&
              (rejet?.id === d.id ? (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (rejet.motif.trim())
                      reviser.mutate(
                        { id: d.id, decision: 'rejected', notes: rejet.motif },
                        { onSuccess: () => setRejet(null) },
                      )
                  }}
                >
                  <label className="block space-y-1">
                    <span className="text-xs font-medium">Motif du rejet (envoyé à l'utilisateur)</span>
                    <textarea
                      rows={2}
                      aria-label="Motif du rejet"
                      value={rejet.motif}
                      onChange={(e) => setRejet({ id: d.id, motif: e.target.value })}
                      placeholder="Ex. : document illisible, nom différent du compte, pièce expirée…"
                      className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      variant="destructive"
                      disabled={!rejet.motif.trim() || reviser.isPending}
                    >
                      Confirmer le rejet
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setRejet(null)}>
                      Annuler
                    </Button>
                  </div>
                </form>
              ) : (
                <div className={cn('flex flex-wrap gap-2 border-t pt-3')}>
                  <Button
                    size="sm"
                    disabled={reviser.isPending}
                    onClick={() => reviser.mutate({ id: d.id, decision: 'approved' })}
                  >
                    Approuver
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejet({ id: d.id, motif: '' })}>
                    Rejeter…
                  </Button>
                </div>
              ))}
          </li>
        ))}
      </ul>
    </div>
  )
}
