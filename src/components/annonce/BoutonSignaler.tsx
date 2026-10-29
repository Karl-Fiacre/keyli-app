import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useSession } from '@/hooks/useSession'
import { MOTIFS_SIGNALEMENT, useSignaler, type MotifSignalement } from '@/hooks/useVerification'
import { messageErreur } from '@/lib/erreurs'

// « Signaler cette annonce » : motif dans une liste + précision facultative
// (obligatoire pour « Autre ») ; traité par l'équipe Keyli
export function BoutonSignaler({ propertyId }: { propertyId: string }) {
  const { session } = useSession()
  const emplacement = useLocation()
  const signaler = useSignaler()
  const [ouvert, setOuvert] = useState(false)
  const [motif, setMotif] = useState<MotifSignalement | ''>('')
  const [precision, setPrecision] = useState('')

  if (signaler.isSuccess) {
    return <Alert variant="succes">Merci : votre signalement a été transmis à l'équipe Keyli.</Alert>
  }
  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        Signaler cette annonce
      </button>
    )
  }
  if (!session) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link to="/connexion" state={{ depuis: emplacement.pathname }} className="font-semibold underline">
          Connectez-vous
        </Link>{' '}
        pour signaler cette annonce.
      </p>
    )
  }

  const precisionRequise = motif === 'autre'
  return (
    <form
      className="space-y-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (motif && (!precisionRequise || precision.trim())) signaler.mutate({ propertyId, motif, precision })
      }}
    >
      <p className="text-sm font-semibold">Signaler cette annonce</p>
      <fieldset className="space-y-1.5">
        <legend className="sr-only">Motif</legend>
        {MOTIFS_SIGNALEMENT.map(([valeur, libelle]) => (
          <label key={valeur} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="motif"
              value={valeur}
              checked={motif === valeur}
              onChange={() => setMotif(valeur)}
              className="h-4 w-4 accent-primary"
            />
            {libelle}
          </label>
        ))}
      </fieldset>
      <label className="block space-y-1">
        <span className="text-xs font-medium">
          Précision {precisionRequise ? '(obligatoire)' : '(facultative)'}
        </span>
        <textarea
          rows={3}
          maxLength={1000}
          value={precision}
          onChange={(e) => setPrecision(e.target.value)}
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </label>
      {signaler.isError && <Alert variant="erreur">{messageErreur(signaler.error)}</Alert>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOuvert(false)}>
          Annuler
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!motif || (precisionRequise && !precision.trim()) || signaler.isPending}
        >
          {signaler.isPending ? 'Envoi…' : 'Envoyer le signalement'}
        </Button>
      </div>
    </form>
  )
}
