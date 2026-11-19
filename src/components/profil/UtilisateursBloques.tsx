import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useDebloquer, useMesBlocages } from '@/partage/hooks/useBlocages'
import { messageErreur } from '@/partage/lib/erreurs'

// Liste des utilisateurs bloqués, avec « Débloquer » (profil)
export function UtilisateursBloques() {
  const blocages = useMesBlocages()
  const debloquer = useDebloquer()
  if (!blocages.data?.length) return null

  return (
    <div id="bloques" className="mt-8 border-t pt-6">
      <h2 className="font-semibold">Utilisateurs bloqués</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ils ne peuvent plus vous écrire, et vous ne pouvez plus leur écrire.
      </p>
      <ul className="mt-3 divide-y rounded-lg border">
        {blocages.data.map((b) => (
          <li key={b.bloque_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span>{b.nom}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={debloquer.isPending}
              onClick={() => debloquer.mutate(b.bloque_id)}
            >
              Débloquer
            </Button>
          </li>
        ))}
      </ul>
      {debloquer.isError && (
        <Alert variant="erreur" className="mt-3">
          {messageErreur(debloquer.error)}
        </Alert>
      )}
    </div>
  )
}
