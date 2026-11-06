import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  LIBELLES_STATUT_RETOUR,
  LIBELLES_TYPE_RETOUR,
  useFileRetours,
  useReponseRetour,
  type StatutRetour,
  type TypeRetour,
} from '@/hooks/useRetours'
import { messageErreur } from '@/lib/erreurs'
import { formatDate } from '@/lib/format'

const FILTRES: StatutRetour[] = ['pending', 'reviewed', 'resolved', 'dismissed']
const LIBELLES_ROLE: Record<string, string> = {
  user: 'Chercheur',
  owner: 'Propriétaire',
  agency: 'Agence',
  admin: 'Admin',
  super_admin: 'Super admin',
}

// Retours des utilisateurs (Sprint 4) : lecture, réponse et statut. Une
// réponse est notifiée à l'auteur (cloche et email) par la base.
export default function AdminRetours() {
  const [statut, setStatut] = useState<StatutRetour>('pending')
  const file = useFileRetours(statut)
  const reponse = useReponseRetour()
  const [brouillons, setBrouillons] = useState<Record<string, string>>({})

  const enregistrer = (id: string, nouveauStatut: StatutRetour, texteActuel: string | null) =>
    reponse.mutate({ id, statut: nouveauStatut, reponse: brouillons[id] ?? texteActuel ?? '' })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Statut des retours">
        {FILTRES.map((v) => (
          <Button
            key={v}
            size="sm"
            variant={statut === v ? 'default' : 'outline'}
            role="tab"
            aria-selected={statut === v}
            onClick={() => setStatut(v)}
          >
            {LIBELLES_STATUT_RETOUR[v]}
          </Button>
        ))}
      </div>

      {reponse.isError && <Alert variant="erreur">{messageErreur(reponse.error)}</Alert>}
      {file.isPending && <p className="text-muted-foreground">Chargement…</p>}
      {file.isError && <Alert variant="erreur">{messageErreur(file.error)}</Alert>}
      {file.data?.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucun retour dans cette catégorie.
        </p>
      )}

      <ul className="space-y-4">
        {file.data?.map((r) => {
          const id = `reponse-${r.id}`
          return (
            <li key={r.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {LIBELLES_TYPE_RETOUR[(r.type ?? 'suggestion') as TypeRetour]}
                    {r.created_at ? ` · ${formatDate(r.created_at)}` : ''}
                    {r.auteur
                      ? ` · ${r.auteur.nom} (${LIBELLES_ROLE[r.auteur.role] ?? r.auteur.role}, ${r.auteur.email})`
                      : ''}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-line text-sm">{r.message}</p>
              <div className="space-y-2">
                <label htmlFor={id} className="text-sm font-medium">
                  Réponse à l’utilisateur
                </label>
                <textarea
                  id={id}
                  rows={3}
                  maxLength={2000}
                  value={brouillons[r.id] ?? r.admin_response ?? ''}
                  onChange={(e) => setBrouillons((b) => ({ ...b, [r.id]: e.target.value }))}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  L’utilisateur est prévenu (cloche et email) dès qu’une réponse est enregistrée.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={reponse.isPending}
                  onClick={() => enregistrer(r.id, 'resolved', r.admin_response)}
                >
                  Répondre et marquer traité
                </Button>
                {statut !== 'reviewed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reponse.isPending}
                    onClick={() => enregistrer(r.id, 'reviewed', r.admin_response)}
                  >
                    Marquer lu
                  </Button>
                )}
                {statut !== 'dismissed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={reponse.isPending}
                    onClick={() => enregistrer(r.id, 'dismissed', r.admin_response)}
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
