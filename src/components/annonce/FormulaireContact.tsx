import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useSession } from '@/hooks/useSession'
import { useContacterAnnonceur } from '@/hooks/useRecherche'
import { messageErreur } from '@/lib/erreurs'

// Premier message à l'annonceur, par la messagerie Keyli (gratuite, sans
// paywall — docs/MODULES/messagerie.md). Le téléphone reste privé.
export function FormulaireContact({
  propertyId,
  destinataire,
  titreAnnonce,
}: {
  propertyId: string
  destinataire: string
  titreAnnonce: string
}) {
  const { session } = useSession()
  const emplacement = useLocation()
  const contact = useContacterAnnonceur()
  const [message, setMessage] = useState(
    `Bonjour, votre annonce « ${titreAnnonce} » m'intéresse. Est-elle toujours disponible ?`,
  )

  if (!session) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">Créez un compte gratuit ou connectez-vous pour écrire à l'annonceur.</p>
        <Button asChild className="w-full">
          <Link to="/connexion" state={{ depuis: emplacement.pathname }}>
            Se connecter pour contacter
          </Link>
        </Button>
      </div>
    )
  }

  if (contact.isSuccess) {
    return (
      <Alert variant="succes">
        Message envoyé. L'annonceur vous répondra dans votre{' '}
        <Link to={`/messages/${propertyId}/${destinataire}`} className="font-semibold underline">
          messagerie Keyli
        </Link>
        .
      </Alert>
    )
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (message.trim()) contact.mutate({ propertyId, destinataire, message: message.trim() })
      }}
    >
      <label htmlFor="message-contact" className="text-sm font-medium">
        Votre message
      </label>
      <textarea
        id="message-contact"
        rows={4}
        maxLength={2000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {contact.isError && <Alert variant="erreur">{messageErreur(contact.error)}</Alert>}
      <Button type="submit" className="w-full" disabled={contact.isPending || !message.trim()}>
        {contact.isPending ? 'Envoi…' : 'Envoyer le message'}
      </Button>
      <p className="text-xs text-muted-foreground">Gratuit, sans engagement. Vos coordonnées ne sont pas partagées.</p>
    </form>
  )
}
