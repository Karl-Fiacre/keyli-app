import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { MOT_CONFIRMATION_SUPPRESSION, useSupprimerCompte } from '@/partage/hooks/useCompte'
import { messageErreur } from '@/partage/lib/erreurs'

// « Supprimer mon compte » (exigence Google Play / App Store) : la
// suppression est faite par la fonction Edge supprimer-compte. Ce qui est
// effacé et ce qui est conservé est expliqué sur /suppression-compte.
export function SupprimerCompte() {
  const navigate = useNavigate()
  const suppression = useSupprimerCompte()
  const [ouvert, setOuvert] = useState(false)
  const [saisie, setSaisie] = useState('')
  const confirme = saisie.trim().toUpperCase() === MOT_CONFIRMATION_SUPPRESSION

  return (
    <div id="suppression" className="mt-8 border-t pt-6">
      <h2 className="font-semibold">Supprimer mon compte</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Vos annonces sont retirées, vos séjours à venir annulés, et vos messages, favoris, alertes et documents
        effacés. Les paiements sont conservés le temps imposé par la loi. Cette action est définitive.{' '}
        <Link to="/suppression-compte" className="font-medium underline">
          En savoir plus
        </Link>
      </p>
      {!ouvert ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 border-destructive text-destructive-texte"
          onClick={() => setOuvert(true)}
        >
          Supprimer mon compte
        </Button>
      ) : (
        <form
          className="mt-4 space-y-3 rounded-lg border border-destructive/40 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (confirme) suppression.mutate({ confirmation: saisie }, { onSuccess: () => navigate('/', { replace: true }) })
          }}
        >
          <label className="block space-y-1.5 text-sm">
            <span>
              Pour confirmer, tapez <strong>{MOT_CONFIRMATION_SUPPRESSION}</strong>
            </span>
            <Input value={saisie} onChange={(e) => setSaisie(e.target.value)} autoComplete="off" />
          </label>
          {suppression.isError && <Alert variant="erreur">{messageErreur(suppression.error)}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" disabled={!confirme || suppression.isPending}>
              {suppression.isPending ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOuvert(false)} disabled={suppression.isPending}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
