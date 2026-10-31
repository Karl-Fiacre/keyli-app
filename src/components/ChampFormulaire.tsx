import { useId, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'

// Libellé + champ + message d'erreur, avec les attributs d'accessibilité
// reliés (aria-invalid, aria-describedby).
export function ChampFormulaire({
  libelle,
  erreur,
  aide,
  children,
}: {
  libelle: string
  erreur?: string
  aide?: ReactNode
  children: (attributs: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}) {
  const id = useId()
  const idMessage = `${id}-message`
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{libelle}</Label>
      {children({ id, 'aria-invalid': !!erreur, 'aria-describedby': erreur || aide ? idMessage : undefined })}
      {erreur ? (
        <p id={idMessage} className="text-xs font-medium text-destructive-texte">
          {erreur}
        </p>
      ) : aide ? (
        <div id={idMessage}>{aide}</div>
      ) : null}
    </div>
  )
}
