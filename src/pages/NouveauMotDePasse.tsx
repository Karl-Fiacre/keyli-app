import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import { IndicateurRobustesse } from '@/components/IndicateurRobustesse'
import { useSession } from '@/hooks/useSession'
import { useNouveauMotDePasse } from '@/hooks/useCompte'
import { messageErreur } from '@/lib/erreurs'
import { schemaNouveauMotDePasse, type DonneesNouveauMotDePasse } from '@/lib/validation'

// Page ouverte par le lien de réinitialisation : Supabase y ouvre une session
// temporaire (événement PASSWORD_RECOVERY) qui permet de changer le mot de passe.
export default function NouveauMotDePasse() {
  const { session, chargement } = useSession()
  const changement = useNouveauMotDePasse()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DonneesNouveauMotDePasse>({
    resolver: zodResolver(schemaNouveauMotDePasse),
    defaultValues: { motDePasse: '', confirmation: '' },
  })

  let contenu
  if (chargement) {
    contenu = <p className="text-muted-foreground">Chargement…</p>
  } else if (changement.isSuccess) {
    contenu = (
      <div className="space-y-4">
        <Alert variant="succes">Votre mot de passe a été modifié.</Alert>
        <Button asChild className="w-full">
          <Link to="/profil">Accéder à mon profil</Link>
        </Button>
      </div>
    )
  } else if (!session) {
    contenu = (
      <div className="space-y-4">
        <Alert variant="erreur">Ce lien est invalide ou a expiré. Demandez-en un nouveau.</Alert>
        <Button asChild variant="outline" className="w-full">
          <Link to="/mot-de-passe-oublie">Nouveau lien</Link>
        </Button>
      </div>
    )
  } else {
    contenu = (
      <form onSubmit={handleSubmit((d) => changement.mutate(d.motDePasse))} noValidate className="space-y-5">
        <ChampFormulaire libelle="Nouveau mot de passe" erreur={errors.motDePasse?.message}
          aide={<IndicateurRobustesse motDePasse={watch('motDePasse')} />}>
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('motDePasse')} />}
        </ChampFormulaire>
        <ChampFormulaire libelle="Confirmer le mot de passe" erreur={errors.confirmation?.message}>
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('confirmation')} />}
        </ChampFormulaire>
        {changement.isError && <Alert variant="erreur">{messageErreur(changement.error)}</Alert>}
        <Button type="submit" className="w-full" disabled={changement.isPending}>
          {changement.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>
    )
  }

  return (
    <section className="container flex justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>Choisissez un mot de passe d'au moins 8 caractères.</CardDescription>
        </CardHeader>
        <CardContent>{contenu}</CardContent>
      </Card>
    </section>
  )
}
