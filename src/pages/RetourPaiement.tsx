import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVerificationPaiement } from '@/hooks/useAbonnement'

// Retour de Paystack (callback_url) : Paystack ajoute ?reference=… à l'URL.
// On fait vérifier le paiement par le serveur ; l'abonnement n'est actif que
// si le serveur a confirmé le paiement auprès de Paystack.
export default function RetourPaiement() {
  const [parametres] = useSearchParams()
  const reference = parametres.get('reference') ?? parametres.get('trxref') ?? ''
  const verification = useVerificationPaiement()
  const lance = useRef(false)

  useEffect(() => {
    if (reference && !lance.current) {
      lance.current = true
      verification.mutate(reference)
    }
  }, [reference, verification])

  const statut = verification.data

  return (
    <section className="container flex justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Paiement de l'abonnement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!reference && <Alert variant="erreur">Référence de paiement absente.</Alert>}
          {verification.isPending && <p className="text-muted-foreground">Vérification du paiement auprès de Paystack…</p>}
          {verification.isError && <Alert variant="erreur">{verification.error.message}</Alert>}
          {statut === 'success' && <Alert variant="succes">Paiement confirmé : votre abonnement est actif.</Alert>}
          {statut === 'failed' && (
            <Alert variant="erreur">Le paiement n'a pas pu être validé. Si un montant a été débité, contactez le support Keyli avec la référence {reference}.</Alert>
          )}
          {statut === 'pending' && (
            <Alert>
              Paiement en cours de confirmation. Votre abonnement sera activé automatiquement dès réception de la
              confirmation de Paystack.
            </Alert>
          )}
          {statut === 'pending' && (
            <Button variant="outline" className="w-full" onClick={() => verification.mutate(reference)}>
              Vérifier à nouveau
            </Button>
          )}
          <Button asChild className="w-full">
            <Link to="/abonnement">Retour à mon abonnement</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
