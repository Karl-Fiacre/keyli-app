import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { SaisieEtoiles } from '@/components/avis/Etoiles'
import { useEnregistrerAvis, useMonAvis } from '@/hooks/useVisites'
import { messageErreur } from '@/lib/erreurs'

const LONGUEUR_MAX = 500

// Donner (ou modifier) son avis sur une personne, pour un bien — public, sous
// le nom « Prénom I. » ; la base vérifie le droit de noter
export function FormulaireAvis({
  propertyId,
  note,
  nomNote,
  onFini,
}: {
  propertyId: string
  note: string
  nomNote: string
  onFini: () => void
}) {
  const existant = useMonAvis(propertyId, note)
  const enregistrer = useEnregistrerAvis()
  const [etoiles, setEtoiles] = useState<number | null>(null)
  const [commentaire, setCommentaire] = useState<string | null>(null)

  if (existant.isPending) return <p className="text-sm text-muted-foreground">Chargement…</p>
  const valeurEtoiles = etoiles ?? existant.data?.rating ?? 0
  const valeurCommentaire = commentaire ?? existant.data?.comment ?? ''

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valeurEtoiles) return
        enregistrer.mutate(
          { id: existant.data?.id, propertyId, note, etoiles: valeurEtoiles, commentaire: valeurCommentaire },
          { onSuccess: onFini },
        )
      }}
    >
      <p className="text-sm font-medium">
        {existant.data ? 'Modifier votre avis sur' : 'Votre avis sur'} {nomNote}
      </p>
      <SaisieEtoiles valeur={valeurEtoiles} onChange={setEtoiles} />
      <label htmlFor="commentaire-avis" className="sr-only">
        Commentaire
      </label>
      <textarea
        id="commentaire-avis"
        rows={3}
        maxLength={LONGUEUR_MAX}
        value={valeurCommentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        placeholder="Ponctualité, état du logement, conformité à l'annonce… (facultatif)"
        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <p className="text-right text-xs text-muted-foreground">
        {valeurCommentaire.length} / {LONGUEUR_MAX}
      </p>
      {enregistrer.isError && <Alert variant="erreur">{messageErreur(enregistrer.error)}</Alert>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onFini}>
          Annuler
        </Button>
        <Button type="submit" disabled={!valeurEtoiles || enregistrer.isPending}>
          {enregistrer.isPending ? 'Envoi…' : existant.data ? 'Mettre à jour' : 'Publier mon avis'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Votre avis est public, signé de votre prénom et de votre initiale.</p>
    </form>
  )
}
