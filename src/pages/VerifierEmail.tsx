import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/hooks/useSession'
import { useRenvoiConfirmation } from '@/hooks/useCompte'
import { messageErreur } from '@/lib/erreurs'

// Deux usages : juste après l'inscription (« consultez votre boîte ») et au
// retour du lien de confirmation (Supabase ouvre la session depuis l'URL).
export default function VerifierEmail() {
  const { session, chargement } = useSession()
  const [parametres] = useSearchParams()
  const email = parametres.get('email') ?? ''
  const renvoi = useRenvoiConfirmation()

  if (!chargement && session?.user.email_confirmed_at) {
    return (
      <section className="container flex justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Adresse email confirmée</CardTitle>
            <CardDescription>Votre compte Keyli est actif.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/profil">Accéder à mon profil</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="container flex justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vérifiez votre boîte email</CardTitle>
          <CardDescription>
            {email ? (
              <>Si l'adresse <strong className="text-foreground">{email}</strong> n'est pas déjà utilisée, un lien de confirmation vient d'y être envoyé.</>
            ) : (
              'Un lien de confirmation vous a été envoyé par email.'
            )}{' '}
            Ouvrez-le pour activer votre compte : la connexion n'est possible qu'après cette confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renvoi.isSuccess && <Alert variant="succes">Un nouveau lien vient d'être envoyé.</Alert>}
          {renvoi.isError && <Alert variant="erreur">{messageErreur(renvoi.error)}</Alert>}
          {email && (
            <Button variant="outline" className="w-full" disabled={renvoi.isPending} onClick={() => renvoi.mutate(email)}>
              {renvoi.isPending ? 'Envoi…' : 'Renvoyer le lien'}
            </Button>
          )}
          <Button variant="link" className="w-full" asChild>
            <Link to="/connexion">Retour à la connexion</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
