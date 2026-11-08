import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useErreursRecentes } from '@/partage/hooks/useAdmin'
import { messageErreur } from '@/partage/lib/erreurs'
import { formatDate } from '@/partage/lib/format'

const PERIODES = [1, 7, 30] as const

// Journal des erreurs rencontrées par les utilisateurs (Sprint 6). Données
// sans information personnelle : page, message nettoyé, code, nombre de
// comptes touchés. Conservées 90 jours.
export default function AdminErreurs() {
  const [jours, setJours] = useState<number>(7)
  const erreurs = useErreursRecentes(jours)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Erreurs inattendues rencontrées dans l’application, regroupées par message et par page.
        </p>
        <div className="flex gap-2" role="tablist" aria-label="Période">
          {PERIODES.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={jours === p ? 'default' : 'outline'}
              role="tab"
              aria-selected={jours === p}
              onClick={() => setJours(p)}
            >
              {p === 1 ? '24 h' : `${p} jours`}
            </Button>
          ))}
        </div>
      </div>

      {erreurs.isPending && <p className="text-muted-foreground">Chargement…</p>}
      {erreurs.isError && <Alert variant="erreur">{messageErreur(erreurs.error)}</Alert>}
      {erreurs.data?.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune erreur sur la période.
        </p>
      )}

      <ul className="space-y-3">
        {erreurs.data?.map((e, i) => (
          <li key={`${e.message}-${e.page}-${i}`} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="min-w-0 break-words font-mono text-sm">{e.message}</p>
              <span className="shrink-0 rounded-pill bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive-texte">
                {Number(e.occurrences)} fois
              </span>
            </div>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              Page {e.page}
              {e.code ? ` · code ${e.code}` : ''} · {Number(e.comptes)} compte{Number(e.comptes) > 1 ? 's' : ''}{' '}
              connecté{Number(e.comptes) > 1 ? 's' : ''} touché{Number(e.comptes) > 1 ? 's' : ''} · dernière le{' '}
              {formatDate(e.derniere)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
