import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import { useConnexion } from '@/hooks/useCompte'
import { messageErreur } from '@/lib/erreurs'
import { schemaConnexion, type DonneesConnexion } from '@/lib/validation'

export default function Connexion() {
  const connexion = useConnexion()
  const naviguer = useNavigate()
  const etat = useLocation().state as { depuis?: string } | null
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DonneesConnexion>({
    resolver: zodResolver(schemaConnexion),
    defaultValues: { email: '', motDePasse: '' },
  })

  const envoyer = handleSubmit((d) =>
    connexion.mutate(d, { onSuccess: () => naviguer(etat?.depuis ?? '/tableau-de-bord', { replace: true }) }),
  )

  return (
    <section className="container flex justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Se connecter</CardTitle>
          <CardDescription>Accédez à votre compte Keyli.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={envoyer} noValidate className="space-y-5">
            <ChampFormulaire libelle="Adresse email" erreur={errors.email?.message}>
              {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
            </ChampFormulaire>
            <ChampFormulaire libelle="Mot de passe" erreur={errors.motDePasse?.message}>
              {(a) => <Input {...a} type="password" autoComplete="current-password" {...register('motDePasse')} />}
            </ChampFormulaire>
            <div className="text-right">
              <Link to="/mot-de-passe-oublie" className="text-sm font-semibold text-primary-glow hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            {connexion.isError && <Alert variant="erreur">{messageErreur(connexion.error)}</Alert>}

            <Button type="submit" className="w-full" disabled={connexion.isPending}>
              {connexion.isPending ? 'Connexion…' : 'Se connecter'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Pas encore de compte ?{' '}
              <Link to="/inscription" className="font-semibold text-primary-glow hover:underline">
                Créer un compte
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
