import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import { LIBELLES_SUJET_SUPPORT, useEnvoiSupport } from '@/partage/hooks/useSupport'
import { useSession } from '@/partage/hooks/useSession'
import { messageErreur } from '@/partage/lib/erreurs'
import { SUJETS_SUPPORT, schemaSupport, type DonneesSupport } from '@/partage/lib/validation'
import { cn } from '@/lib/utils'

const champ =
  'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

// Formulaire « Nous écrire » de la page Aide (Sprint 7) : ouvert à tous,
// même sans compte. La base valide et limite le débit ; l'équipe répond
// par email (onglet « Support » du back-office).
export function FormulaireSupport() {
  const { session } = useSession()
  const envoi = useEnvoiSupport()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DonneesSupport>({
    resolver: zodResolver(schemaSupport),
    defaultValues: { email: session?.user.email ?? '', sujet: 'autre' },
  })

  if (envoi.isSuccess) {
    return (
      <div className="kf-zoom rounded-lg border bg-card p-6 text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
        <p className="mt-3 font-semibold">Message envoyé, merci !</p>
        <p className="mt-1 text-sm text-muted-foreground">L’équipe Keyli vous répond par email.</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit((d) => envoi.mutate(d))}
      noValidate
      className="space-y-4 rounded-lg border bg-card p-5"
      aria-label="Écrire à l’équipe Keyli"
    >
      {session && (
        <p className="text-sm text-muted-foreground">
          Une suggestion ou un problème sur votre compte ? Vous pouvez aussi passer par{' '}
          <Link to="/retours" className="font-medium text-primary-glow hover:underline">
            Mes retours
          </Link>{' '}
          : la réponse de l’équipe y reste visible.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampFormulaire libelle="Votre nom" erreur={errors.nom?.message}>
          {(a) => <Input {...a} autoComplete="name" maxLength={80} {...register('nom')} />}
        </ChampFormulaire>
        <ChampFormulaire libelle="Email pour la réponse" erreur={errors.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
        </ChampFormulaire>
      </div>
      <ChampFormulaire libelle="Sujet" erreur={errors.sujet?.message}>
        {(a) => (
          <select {...a} className={cn(champ, 'h-10')} {...register('sujet')}>
            {SUJETS_SUPPORT.map((s) => (
              <option key={s} value={s}>
                {LIBELLES_SUJET_SUPPORT[s]}
              </option>
            ))}
          </select>
        )}
      </ChampFormulaire>
      <ChampFormulaire libelle="Votre message" erreur={errors.message?.message}>
        {(a) => <textarea {...a} rows={4} maxLength={2000} className={champ} {...register('message')} />}
      </ChampFormulaire>
      <p className="text-xs text-muted-foreground">
        Votre adresse sert uniquement à vous répondre (voir la{' '}
        <Link to="/confidentialite" className="underline underline-offset-2">
          politique de confidentialité
        </Link>
        ). Ne communiquez jamais de mot de passe.
      </p>
      {envoi.isError && <Alert variant="erreur">{messageErreur(envoi.error)}</Alert>}
      <Button type="submit" disabled={envoi.isPending}>
        {envoi.isPending ? 'Envoi…' : 'Envoyer'}
      </Button>
    </form>
  )
}
