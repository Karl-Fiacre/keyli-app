import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import { IndicateurRobustesse } from '@/components/IndicateurRobustesse'
import { useInscription } from '@/hooks/useCompte'
import { messageErreur } from '@/lib/erreurs'
import { schemaInscription, type DonneesInscription, type RoleInscription } from '@/lib/validation'
import { cn } from '@/lib/utils'

// Inscription (docs/MODULES/auth.md) : choix du rôle (jamais admin), nom
// d'agence obligatoire pour une agence, indicateur de robustesse, email de
// confirmation obligatoire avant toute connexion.
const ROLES: Array<{ valeur: RoleInscription; titre: string; description: string }> = [
  { valeur: 'user', titre: 'Je cherche un logement', description: 'Louer ou acheter, contacter les propriétaires.' },
  { valeur: 'owner', titre: 'Je suis propriétaire', description: 'Publier et gérer mes biens.' },
  { valeur: 'agency', titre: 'Je suis une agence', description: 'Gérer un portefeuille et une équipe.' },
]

export default function Inscription() {
  const inscription = useInscription()
  const naviguer = useNavigate()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DonneesInscription>({
    resolver: zodResolver(schemaInscription),
    defaultValues: { role: 'user', nomAgence: '', prenom: '', nom: '', telephone: '', email: '', motDePasse: '', confirmation: '' },
  })
  const role = watch('role')
  const motDePasse = watch('motDePasse')

  const envoyer = handleSubmit((d) =>
    inscription.mutate(d, {
      onSuccess: () => naviguer(`/verifier-email?email=${encodeURIComponent(d.email)}`),
    }),
  )

  return (
    <section className="container flex justify-center py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Créer un compte Keyli</CardTitle>
          <CardDescription>Gratuit pour chercher un logement. Les propriétaires et agences choisissent ensuite un forfait.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={envoyer} noValidate className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Vous êtes</legend>
              <div role="radiogroup" aria-label="Type de compte" className="grid gap-2 sm:grid-cols-3">
                {ROLES.map((r) => (
                  <button
                    key={r.valeur}
                    type="button"
                    role="radio"
                    aria-checked={role === r.valeur}
                    onClick={() => setValue('role', r.valeur, { shouldValidate: true })}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-[colors,transform] duration-150 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
                      role === r.valeur ? 'border-primary bg-secondary ring-2 ring-primary' : 'hover:bg-secondary',
                    )}
                  >
                    <span className="block text-sm font-semibold">{r.titre}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{r.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {role === 'agency' && (
              <ChampFormulaire libelle="Nom de l'agence (raison sociale)" erreur={errors.nomAgence?.message}
                aide={<p className="text-xs text-muted-foreground">Tel qu'il figure sur votre registre de commerce : il sera figé après vérification.</p>}>
                {(a) => <Input {...a} autoComplete="organization" {...register('nomAgence')} />}
              </ChampFormulaire>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <ChampFormulaire libelle="Prénom" erreur={errors.prenom?.message}>
                {(a) => <Input {...a} autoComplete="given-name" {...register('prenom')} />}
              </ChampFormulaire>
              <ChampFormulaire libelle="Nom" erreur={errors.nom?.message}>
                {(a) => <Input {...a} autoComplete="family-name" {...register('nom')} />}
              </ChampFormulaire>
            </div>

            <ChampFormulaire libelle="Téléphone (facultatif)" erreur={errors.telephone?.message}>
              {(a) => <Input {...a} type="tel" placeholder="+225 07 00 00 00 00" autoComplete="tel" {...register('telephone')} />}
            </ChampFormulaire>

            <ChampFormulaire libelle="Adresse email" erreur={errors.email?.message}>
              {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
            </ChampFormulaire>

            <ChampFormulaire libelle="Mot de passe" erreur={errors.motDePasse?.message}
              aide={<IndicateurRobustesse motDePasse={motDePasse} />}>
              {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('motDePasse')} />}
            </ChampFormulaire>
            {errors.motDePasse && <IndicateurRobustesse motDePasse={motDePasse} />}

            <ChampFormulaire libelle="Confirmer le mot de passe" erreur={errors.confirmation?.message}>
              {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('confirmation')} />}
            </ChampFormulaire>

            {inscription.isError && <Alert variant="erreur">{messageErreur(inscription.error)}</Alert>}

            <Button type="submit" className="w-full" disabled={inscription.isPending}>
              {inscription.isPending ? 'Création du compte…' : 'Créer mon compte'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Déjà inscrit ?{' '}
              <Link to="/connexion" className="font-semibold text-primary-glow hover:underline">
                Se connecter
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
