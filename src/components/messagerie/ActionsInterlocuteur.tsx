import { useState } from 'react'
import { Ban, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { MOTIFS_SIGNALEMENT, type MotifSignalement } from '@/partage/hooks/useVerification'
import { useBloquer, useDebloquer, useSignalerUtilisateur } from '@/partage/hooks/useBlocages'
import { messageErreur } from '@/partage/lib/erreurs'

// « Signaler » et « Bloquer » l'interlocuteur d'une conversation
// (exigence des boutiques pour le contenu généré par les utilisateurs)
export function ActionsInterlocuteur({
  interlocuteur,
  nom,
  bloque,
}: {
  interlocuteur: string
  nom: string
  bloque: boolean
}) {
  const [panneau, setPanneau] = useState<'signaler' | 'bloquer' | null>(null)
  const [motif, setMotif] = useState<MotifSignalement | ''>('')
  const [precision, setPrecision] = useState('')
  const signaler = useSignalerUtilisateur()
  const bloquer = useBloquer()
  const debloquer = useDebloquer()
  const precisionRequise = motif === 'autre'
  const basculer = (p: 'signaler' | 'bloquer') => setPanneau(panneau === p ? null : p)

  return (
    <div className="border-b">
      <div className="flex flex-wrap justify-end gap-1 px-3 py-1.5">
        <Button type="button" variant="ghost" size="sm" onClick={() => basculer('signaler')}>
          <Flag className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Signaler
        </Button>
        {bloque ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={debloquer.isPending}
            onClick={() => debloquer.mutate(interlocuteur)}
          >
            Débloquer
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => basculer('bloquer')}>
            <Ban className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Bloquer
          </Button>
        )}
      </div>

      {panneau === 'bloquer' && !bloque && (
        <div className="space-y-2 px-4 pb-3 text-sm">
          <p>Bloquer {nom} ? Vous ne pourrez plus vous écrire. Vous pourrez le débloquer depuis votre profil.</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={bloquer.isPending}
              onClick={() => bloquer.mutate(interlocuteur, { onSuccess: () => setPanneau(null) })}
            >
              Bloquer
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPanneau(null)}>
              Annuler
            </Button>
          </div>
          {bloquer.isError && <Alert variant="erreur">{messageErreur(bloquer.error)}</Alert>}
        </div>
      )}

      {panneau === 'signaler' &&
        (signaler.isSuccess ? (
          <Alert variant="succes" className="mx-4 mb-3">
            Merci : votre signalement a été transmis à l'équipe Keyli.
          </Alert>
        ) : (
          <form
            className="space-y-2 px-4 pb-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (motif && (!precisionRequise || precision.trim()))
                signaler.mutate({ utilisateurId: interlocuteur, motif, precision })
            }}
          >
            <p className="text-sm font-semibold">Signaler {nom}</p>
            <fieldset className="space-y-1">
              <legend className="sr-only">Motif</legend>
              {MOTIFS_SIGNALEMENT.map(([valeur, libelle]) => (
                <label key={valeur} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="motif-utilisateur"
                    value={valeur}
                    checked={motif === valeur}
                    onChange={() => setMotif(valeur)}
                    className="h-4 w-4 accent-primary"
                  />
                  {libelle}
                </label>
              ))}
            </fieldset>
            <textarea
              rows={2}
              maxLength={1000}
              value={precision}
              aria-label="Précision"
              placeholder={precisionRequise ? 'Précision (obligatoire)' : 'Précision (facultative)'}
              onChange={(e) => setPrecision(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {signaler.isError && <Alert variant="erreur">{messageErreur(signaler.error)}</Alert>}
            <Button
              type="submit"
              size="sm"
              disabled={!motif || (precisionRequise && !precision.trim()) || signaler.isPending}
            >
              Envoyer le signalement
            </Button>
          </form>
        ))}
    </div>
  )
}
