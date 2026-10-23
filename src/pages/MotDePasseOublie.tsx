import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import { useDemandeReinitialisation } from '@/hooks/useCompte'
import { messageErreur } from '@/lib/erreurs'
import { schemaEmail, type DonneesEmail } from '@/lib/validation'

export default function MotDePasseOublie() {
  const demande = useDemandeReinitialisation()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DonneesEmail>({ resolver: zodResolver(schemaEmail), defaultValues: { email: '' } })

  return (
    <section className="container flex justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>Nous vous envoyons un lien pour choisir un nouveau mot de passe.</CardDescription>
        </CardHeader>
        <CardContent>
          {demande.isSuccess ? (
            // Même réponse que l'adresse existe ou non : ne révèle pas les comptes
            <Alert variant="succes">
              Si un compte existe avec cette adresse, un lien de réinitialisation vient d'y être envoyé.
            </Alert>
          ) : (
            <form onSubmit={handleSubmit((d) => demande.mutate(d.email))} noValidate className="space-y-5">
              <ChampFormulaire libelle="Adresse email" erreur={errors.email?.message}>
                {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
              </ChampFormulaire>
              {demande.isError && <Alert variant="erreur">{messageErreur(demande.error)}</Alert>}
              <Button type="submit" className="w-full" disabled={demande.isPending}>
                {demande.isPending ? 'Envoi…' : 'Recevoir le lien'}
              </Button>
            </form>
          )}
          <Button variant="link" className="mt-4 w-full" asChild>
            <Link to="/connexion">Retour à la connexion</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
