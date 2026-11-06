import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MessageSquareHeart } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import {
  LIBELLES_STATUT_RETOUR,
  LIBELLES_TYPE_RETOUR,
  useEnvoiRetour,
  useMesRetours,
  type StatutRetour,
  type TypeRetour,
} from '@/hooks/useRetours'
import { messageErreur } from '@/lib/erreurs'
import { formatDate } from '@/lib/format'
import { schemaRetour, type DonneesRetour } from '@/lib/validation'
import { cn } from '@/lib/utils'

const champ =
  'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const COULEUR_STATUT: Record<StatutRetour, string> = {
  pending: 'bg-pending/15 text-pending-texte',
  reviewed: 'bg-secondary text-primary-glow',
  resolved: 'bg-success/15 text-success-texte',
  dismissed: 'bg-secondary text-muted-foreground',
}

// « Donner mon avis » (Sprint 4) : retours envoyés à l'équipe Keyli
// (feedback_keyli) et réponses reçues. La base borne les longueurs et
// limite à 5 retours par jour ; une réponse de l'équipe est notifiée.
export default function Retours() {
  const retours = useMesRetours()
  const envoi = useEnvoiRetour()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DonneesRetour>({
    resolver: zodResolver(schemaRetour),
    defaultValues: { type: 'suggestion', sujet: '', message: '' },
  })

  const envoyer = handleSubmit((d) => envoi.mutate(d, { onSuccess: () => reset() }))

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <MessageSquareHeart className="h-6 w-6 text-primary-glow" aria-hidden />
          Donner mon avis
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Une idée, un problème, une réclamation ? Votre retour est lu par l’équipe Keyli, qui vous répond ici.
        </p>
      </div>

      <form onSubmit={envoyer} noValidate className="space-y-4 rounded-lg border bg-card p-5">
        <ChampFormulaire libelle="Type de retour" erreur={errors.type?.message}>
          {(a) => (
            <select {...a} className={cn(champ, 'h-10')} {...register('type')}>
              {Object.entries(LIBELLES_TYPE_RETOUR).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </ChampFormulaire>
        <ChampFormulaire libelle="Sujet" erreur={errors.sujet?.message}>
          {(a) => <Input {...a} maxLength={120} {...register('sujet')} />}
        </ChampFormulaire>
        <ChampFormulaire libelle="Message" erreur={errors.message?.message}>
          {(a) => <textarea {...a} rows={5} maxLength={2000} className={champ} {...register('message')} />}
        </ChampFormulaire>
        {envoi.isError && <Alert variant="erreur">{messageErreur(envoi.error)}</Alert>}
        {envoi.isSuccess && <Alert variant="succes">Merci ! Votre retour a bien été envoyé à l’équipe Keyli.</Alert>}
        <Button type="submit" disabled={envoi.isPending}>
          {envoi.isPending ? 'Envoi…' : 'Envoyer'}
        </Button>
      </form>

      <section aria-labelledby="titre-mes-retours" className="space-y-3">
        <h2 id="titre-mes-retours" className="text-lg font-semibold">
          Mes retours
        </h2>
        {retours.isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {retours.isError && <Alert variant="erreur">{messageErreur(retours.error)}</Alert>}
        {retours.data?.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Vous n’avez encore envoyé aucun retour.
          </p>
        )}
        <ul className="space-y-3">
          {retours.data?.map((r) => {
            const statut = (r.status ?? 'pending') as StatutRetour
            return (
              <li key={r.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{r.subject}</p>
                  <span className={cn('rounded-pill px-2.5 py-0.5 text-xs font-semibold', COULEUR_STATUT[statut])}>
                    {LIBELLES_STATUT_RETOUR[statut]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {LIBELLES_TYPE_RETOUR[(r.type ?? 'suggestion') as TypeRetour]}
                  {r.created_at ? ` · ${formatDate(r.created_at)}` : ''}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm">{r.message}</p>
                {r.admin_response && (
                  <div className="mt-3 rounded-md border-l-4 border-primary-glow bg-secondary/60 p-3 text-sm">
                    <p className="text-xs font-semibold text-primary-glow">Réponse de l’équipe Keyli</p>
                    <p className="mt-1 whitespace-pre-line">{r.admin_response}</p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
