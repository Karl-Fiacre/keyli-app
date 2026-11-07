import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck, CheckCircle2, Headset, MessageSquareHeart } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import { LIBELLES_PROFIL_PILOTE, useCandidaturePilote } from '@/hooks/usePilote'
import { useCommunes } from '@/hooks/useRecherche'
import { messageErreur } from '@/lib/erreurs'
import { PROFILS_PILOTE, schemaCandidature, type DonneesCandidature } from '@/lib/validation'
import { cn } from '@/lib/utils'
import { FondScene } from '@/components/animation/FondScene'
import { TexteCinema } from '@/components/animation/TexteCinema'

const champ =
  'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const AVANTAGES = [
  {
    icone: Headset,
    titre: 'Accompagnement par l’équipe',
    texte: 'Nous vous appelons pour créer votre compte et publier vos premières annonces.',
  },
  {
    icone: BadgeCheck,
    titre: 'Vérification prioritaire',
    texte: 'Vos documents sont examinés en premier : le badge « Vérifié » arrive plus vite.',
  },
  {
    icone: MessageSquareHeart,
    titre: 'Votre avis compte',
    texte: 'Les membres du pilote orientent les prochaines fonctionnalités de Keyli.',
  },
]

// Candidature au pilote d'Abidjan (Sprint 5) : formulaire public, la base
// (candidater_pilote_keyli) valide et ne dit jamais si un email est déjà
// connu. L'équipe trie les candidatures dans l'onglet « Pilote » du back-office.
export default function Pilote() {
  const communes = useCommunes()
  const envoi = useCandidaturePilote()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DonneesCandidature>({
    resolver: zodResolver(schemaCandidature),
    defaultValues: { profil: 'proprietaire', telephone: '+225 ' },
  })
  const profil = watch('profil')

  return (
    <>
      <section
        className="relative isolate overflow-hidden bg-primary py-14 text-primary-foreground md:py-20"
        aria-labelledby="titre-pilote"
      >
        <FondScene />
        <div className="container max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-turquoise">Pilote · Abidjan</p>
          <TexteCinema
            id="titre-pilote"
            className="mt-2 font-titre text-4xl font-bold md:text-5xl"
            segments={[
              { texte: 'Rejoignez les premiers membres de ' },
              { texte: 'Keyli', className: 'text-turquoise' },
            ]}
          />
          <p className="mt-4 text-lg text-primary-foreground/85">
            Propriétaires, agences et chercheurs de logement : participez au lancement de Keyli à Abidjan, avec un
            accompagnement direct de l’équipe.
          </p>
        </div>
      </section>

      <section className="container grid gap-10 py-12 md:py-16 lg:grid-cols-[1fr_1.2fr]">
        <ul className="kf-cascade space-y-5">
          {AVANTAGES.map(({ icone: Icone, titre, texte }) => (
            <li key={titre} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary-glow">
                <Icone className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">{titre}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{texte}</p>
              </div>
            </li>
          ))}
          <li className="text-sm text-muted-foreground">
            Vous préférez commencer seul ?{' '}
            <Link to="/inscription" className="font-medium text-primary-glow underline-offset-4 hover:underline">
              Créez directement votre compte
            </Link>
            .
          </li>
        </ul>

        {envoi.isSuccess ? (
          <div className="kf-zoom rounded-lg border bg-card p-8 text-center shadow-sm" role="status">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
            <h2 className="mt-4 text-xl font-semibold">Candidature reçue, merci !</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              L’équipe Keyli vous contacte par téléphone ou par email dans les prochains jours.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/">Voir les biens disponibles</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((d) => envoi.mutate(d))}
            noValidate
            className="space-y-4 rounded-lg border bg-card p-5 shadow-sm md:p-6"
            aria-labelledby="titre-formulaire-pilote"
          >
            <h2 id="titre-formulaire-pilote" className="text-lg font-semibold">
              Ma candidature
            </h2>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Vous êtes</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {PROFILS_PILOTE.map((p) => (
                  <label
                    key={p}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                      profil === p ? 'border-primary-glow bg-secondary/60 font-medium' : 'hover:bg-secondary/40',
                    )}
                  >
                    <input type="radio" value={p} className="accent-primary" {...register('profil')} />
                    {LIBELLES_PROFIL_PILOTE[p]}
                  </label>
                ))}
              </div>
            </fieldset>

            {profil === 'agence' && (
              <ChampFormulaire libelle="Nom de l’agence" erreur={errors.nomAgence?.message}>
                {(a) => <Input {...a} maxLength={120} {...register('nomAgence')} />}
              </ChampFormulaire>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampFormulaire libelle="Prénom" erreur={errors.prenom?.message}>
                {(a) => <Input {...a} autoComplete="given-name" maxLength={80} {...register('prenom')} />}
              </ChampFormulaire>
              <ChampFormulaire libelle="Nom" erreur={errors.nom?.message}>
                {(a) => <Input {...a} autoComplete="family-name" maxLength={80} {...register('nom')} />}
              </ChampFormulaire>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampFormulaire libelle="Téléphone" erreur={errors.telephone?.message}>
                {(a) => <Input {...a} type="tel" autoComplete="tel" {...register('telephone')} />}
              </ChampFormulaire>
              <ChampFormulaire libelle="Email" erreur={errors.email?.message}>
                {(a) => <Input {...a} type="email" autoComplete="email" {...register('email')} />}
              </ChampFormulaire>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampFormulaire libelle="Commune (facultatif)" erreur={errors.commune?.message}>
                {(a) => (
                  <select {...a} className={cn(champ, 'h-10')} {...register('commune')}>
                    <option value="">—</option>
                    {communes.data?.map((c) => (
                      <option key={c.id} value={c.nom}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                )}
              </ChampFormulaire>
              {profil !== 'chercheur' && (
                <ChampFormulaire libelle="Nombre de biens (facultatif)" erreur={errors.nbBiens?.message}>
                  {(a) => <Input {...a} inputMode="numeric" maxLength={5} {...register('nbBiens')} />}
                </ChampFormulaire>
              )}
            </div>
            <ChampFormulaire libelle="Message (facultatif)" erreur={errors.message?.message}>
              {(a) => <textarea {...a} rows={3} maxLength={1000} className={champ} {...register('message')} />}
            </ChampFormulaire>

            <p className="text-xs text-muted-foreground">
              Vos coordonnées servent uniquement à vous contacter pour le pilote (voir la{' '}
              <Link to="/confidentialite" className="underline underline-offset-2">
                politique de confidentialité
              </Link>
              ).
            </p>
            {envoi.isError && <Alert variant="erreur">{messageErreur(envoi.error)}</Alert>}
            <Button type="submit" className="w-full sm:w-auto" disabled={envoi.isPending}>
              {envoi.isPending ? 'Envoi…' : 'Envoyer ma candidature'}
            </Button>
          </form>
        )}
      </section>
    </>
  )
}
