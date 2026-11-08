import { Link, useSearchParams } from 'react-router-dom'
import { MailX } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDesinscription } from '@/partage/hooks/useEmails'
import { messageErreur } from '@/partage/lib/erreurs'

const FORMAT_JETON = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Lien « Ne plus recevoir ces emails » : accessible sans connexion. Un clic
// de confirmation est demandé (les antivirus de messagerie ouvrent les liens
// tout seuls : une désinscription à l'ouverture se ferait à l'insu de la
// personne).
export default function Desinscription() {
  const [params] = useSearchParams()
  const jeton = params.get('jeton') ?? ''
  const desinscription = useDesinscription()
  const valide = FORMAT_JETON.test(jeton)

  return (
    <section className="container flex justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <MailX className="h-8 w-8 text-primary-glow" aria-hidden />
          <CardTitle className="mt-2">Emails de notification</CardTitle>
          <CardDescription>
            Messages, réservations, visites, alertes : vous les retrouverez toujours dans l’application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!valide ? (
            <Alert variant="erreur">
              Ce lien de désinscription est incomplet. Vous pouvez aussi régler vos emails depuis votre profil.
            </Alert>
          ) : desinscription.isSuccess ? (
            desinscription.data ? (
              <Alert variant="succes">
                C’est fait : vous ne recevrez plus nos emails de notification. Les emails importants concernant votre
                compte (suspension, vérification) restent envoyés.
              </Alert>
            ) : (
              <Alert variant="erreur">Ce lien n’est plus valable. Réglez vos emails depuis votre profil.</Alert>
            )
          ) : (
            <>
              <p className="text-sm">Vous ne souhaitez plus recevoir les emails de notification de Keyli ?</p>
              {desinscription.isError && <Alert variant="erreur">{messageErreur(desinscription.error)}</Alert>}
              <Button onClick={() => desinscription.mutate(jeton)} disabled={desinscription.isPending}>
                {desinscription.isPending ? 'Un instant…' : 'Ne plus recevoir ces emails'}
              </Button>
            </>
          )}
          <p className="text-sm text-muted-foreground">
            Vous changez d’avis ? Réactivez-les à tout moment dans{' '}
            <Link to="/profil" className="font-medium text-primary-glow hover:underline">
              votre profil
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
