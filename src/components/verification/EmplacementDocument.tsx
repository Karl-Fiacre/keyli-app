import { useRef } from 'react'
import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import {
  FORMATS,
  LIBELLES_DOCUMENT,
  useEnvoyerDocument,
  type StatutDocument,
  type TypeDocument,
} from '@/hooks/useVerification'
import { messageErreur } from '@/lib/erreurs'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const STATUTS: Record<StatutDocument, { libelle: string; style: string }> = {
  pending: { libelle: "En cours d'examen", style: 'bg-pending/15 text-pending-texte' },
  approved: { libelle: 'Approuvé', style: 'bg-success/15 text-success-texte' },
  rejected: { libelle: 'À renvoyer', style: 'bg-destructive/10 text-destructive-texte' },
}

// Un document de vérification : statut du dernier envoi et, s'il n'y en a
// pas ou s'il a été rejeté, bouton d'envoi (PDF / JPEG / PNG, 5 Mo)
export function EmplacementDocument({
  type,
  propertyId,
  document,
  compact = false,
}: {
  type: TypeDocument
  propertyId?: string
  document?: { status: StatutDocument | null; review_notes: string | null; created_at: string | null }
  compact?: boolean
}) {
  const envoi = useEnvoyerDocument()
  const champ = useRef<HTMLInputElement>(null)
  const statut = document?.status ?? null
  const peutEnvoyer = !statut || statut === 'rejected'

  return (
    <div className={cn('space-y-2', !compact && 'rounded-lg border p-4')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!compact && <p className="text-sm font-medium">{LIBELLES_DOCUMENT[type]}</p>}
        {statut ? (
          <span className={cn('rounded-pill px-2.5 py-0.5 text-xs font-semibold', STATUTS[statut].style)}>
            {STATUTS[statut].libelle}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Non envoyé</span>
        )}
      </div>
      {statut === 'pending' && document?.created_at && (
        <p className="text-xs text-muted-foreground">Envoyé le {formatDate(document.created_at)}.</p>
      )}
      {statut === 'rejected' && document?.review_notes && (
        <p className="text-xs text-destructive-texte">Motif : {document.review_notes}</p>
      )}
      {peutEnvoyer && (
        <>
          <input
            ref={champ}
            type="file"
            accept={FORMATS.join(',')}
            className="sr-only"
            aria-label={`Fichier : ${LIBELLES_DOCUMENT[type]}`}
            onChange={(e) => {
              const fichier = e.target.files?.[0]
              if (fichier) envoi.mutate({ type, fichier, propertyId })
              e.target.value = ''
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={envoi.isPending}
            onClick={() => champ.current?.click()}
          >
            <FileUp className="mr-2 h-4 w-4" aria-hidden />
            {envoi.isPending ? 'Envoi…' : statut === 'rejected' ? 'Envoyer un nouveau document' : 'Envoyer le document'}
          </Button>
          {!compact && <p className="text-xs text-muted-foreground">PDF, JPEG ou PNG — 5 Mo au maximum.</p>}
        </>
      )}
      {envoi.isError && <Alert variant="erreur">{messageErreur(envoi.error)}</Alert>}
    </div>
  )
}
