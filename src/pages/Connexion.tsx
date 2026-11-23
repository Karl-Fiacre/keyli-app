import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import { useConnexion, useConnexionFournisseur } from '@/partage/hooks/useCompte'
import { FOURNISSEURS_SOCIAUX as FOURNISSEURS } from '@/partage/lib/connexionSociale'
import { messageErreur } from '@/partage/lib/erreurs'
import { schemaConnexion, type DonneesConnexion } from '@/partage/lib/validation'
import { Revele } from '@/components/animation/Revele'
import { PanneauPhotos } from '@/components/animation/PanneauPhotos'
import { useTitrePage } from '@/hooks/useTitrePage'

export default function Connexion() {
  useTitrePage('Se connecter')
  const connexion = useConnexion()
  const social = useConnexionFournisseur()
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
    connexion.mutate(d, {
      onSuccess: () => naviguer(etat?.depuis ?? '/tableau-de-bord', { replace: true }),
    }),
  )

  return (
    <section className="container py-8 lg:py-12">
      <div className="grid items-stretch gap-10 lg:grid-cols-2">
        {/* Grand écran : photos de logements à gauche, comme l'application */}
        <PanneauPhotos className="hidden min-h-[620px] rounded-accueil shadow-lift lg:block" />
        <div className="flex items-center justify-center">
          <Revele effet="profondeur" className="w-full max-w-md">
            <Card className="w-full">
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
                    {(a) => (
                      <Input {...a} type="password" autoComplete="current-password" {...register('motDePasse')} />
                    )}
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    ou continuer avec
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className={FOURNISSEURS.length === 3 ? 'grid grid-cols-3 gap-3' : 'grid grid-cols-2 gap-3'}>
                    {FOURNISSEURS.map((f) => (
                      <Button
                        key={f.id}
                        type="button"
                        variant="outline"
                        disabled={social.isPending}
                        onClick={() => social.mutate({ fournisseur: f.id, retour: etat?.depuis ?? '/tableau-de-bord' })}
                      >
                        {f.nom}
                      </Button>
                    ))}
                  </div>
                  {social.isError && <Alert variant="erreur">{messageErreur(social.error)}</Alert>}

                  <p className="text-center text-sm text-muted-foreground">
                    Pas encore de compte ?{' '}
                    <Link to="/inscription" className="font-semibold text-primary-glow hover:underline">
                      Créer un compte
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </Revele>
        </div>
      </div>
    </section>
  )
}
