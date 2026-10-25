import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import { AccordDepassement, EtatForfait } from '@/components/annonce/EtatForfait'
import { publicationPossible } from '@/lib/publication'
import { SelecteurAvantages } from '@/components/annonce/SelecteurAvantages'
import { SelecteurPointGps } from '@/components/annonce/SelecteurPointGps'
import { useAvantages, useEtatPublication, usePublierAnnonce, useQuartiers } from '@/hooks/useAnnonces'
import { useProfil } from '@/hooks/useProfil'
import { messageErreur } from '@/lib/erreurs'
import { LIBELLES_TYPE, schemaAnnonce, TYPES_BIEN, type DonneesAnnonce } from '@/lib/validation'
import { cn } from '@/lib/utils'

// Mêmes styles que Input pour les listes et la zone de texte natives
const champNatif =
  'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-destructive'

// Publication d'une annonce (docs/MODULES/annonces.md). Les photos
// s'ajouteront dans un second temps (Cloudinary).
export default function PublierAnnonce() {
  const profil = useProfil()
  const etat = useEtatPublication()
  const avantages = useAvantages()
  const quartiers = useQuartiers()
  const publication = usePublierAnnonce()
  const naviguer = useNavigate()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DonneesAnnonce>({
    resolver: zodResolver(schemaAnnonce),
    defaultValues: { statut: 'a_louer', ville: 'Abidjan', meuble: false, avantages: [], accepteDepassement: false },
  })

  const role = profil.data?.role_keyli
  if (profil.isPending || etat.isPending) {
    return <p className="container py-16 text-center text-muted-foreground">Chargement…</p>
  }
  if (role !== 'owner' && role !== 'agency') {
    return (
      <section className="container flex justify-center py-12">
        <Alert className="max-w-lg">La publication d'annonces est réservée aux propriétaires et aux agences.</Alert>
      </section>
    )
  }
  if (etat.isError || !etat.data) {
    return (
      <section className="container py-12">
        <Alert variant="erreur">{messageErreur(etat.error)}</Alert>
      </section>
    )
  }

  const e = etat.data
  const possible = publicationPossible(e.statut)
  const depassement = e.statut === 'depassement'
  const accord = watch('accepteDepassement')
  const statut = watch('statut')
  const latitude = watch('latitude')
  const longitude = watch('longitude')

  const envoyer = handleSubmit((d) =>
    publication.mutate(
      {
        ...d,
        quartierId: d.quartierId || null,
        accepteDepassement: depassement && d.accepteDepassement,
      },
      { onSuccess: () => naviguer('/annonces', { state: { publiee: true } }) },
    ),
  )

  return (
    <section className="container flex justify-center py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Publier une annonce</CardTitle>
          <CardDescription>
            Votre annonce est visible dès sa publication ; le badge « Vérifié » s'affiche après contrôle de vos
            documents par l'équipe Keyli.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EtatForfait etat={e} />

          {possible && (
            <form onSubmit={envoyer} className="space-y-5" noValidate>
              <ChampFormulaire libelle="Titre de l'annonce" erreur={errors.titre?.message}>
                {(a) => <Input {...a} placeholder="Ex. : Appartement 3 pièces à Cocody Angré" {...register('titre')} />}
              </ChampFormulaire>

              <div className="grid gap-4 sm:grid-cols-2">
                <ChampFormulaire libelle="Type de bien" erreur={errors.type?.message}>
                  {(a) => (
                    <select {...a} className={cn(champNatif, 'h-11')} defaultValue="" {...register('type')}>
                      <option value="" disabled>
                        Choisir…
                      </option>
                      {TYPES_BIEN.map((t) => (
                        <option key={t} value={t}>
                          {LIBELLES_TYPE[t]}
                        </option>
                      ))}
                    </select>
                  )}
                </ChampFormulaire>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Transaction</legend>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup">
                    {(
                      [
                        ['a_louer', 'À louer'],
                        ['a_vendre', 'À vendre'],
                      ] as const
                    ).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={statut === v}
                        onClick={() => setValue('statut', v, { shouldValidate: true })}
                        className={cn(
                          'h-11 rounded-lg border text-sm font-medium transition-colors duration-150',
                          statut === v ? 'border-primary bg-secondary ring-2 ring-primary' : 'hover:bg-secondary',
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>

              <ChampFormulaire
                libelle={statut === 'a_vendre' ? 'Prix de vente (XOF)' : 'Loyer mensuel (XOF)'}
                erreur={errors.prix?.message}
              >
                {(a) => <Input {...a} type="number" inputMode="numeric" min={1} step={1000} {...register('prix')} />}
              </ChampFormulaire>

              <div className="grid gap-4 sm:grid-cols-2">
                <ChampFormulaire libelle="Ville" erreur={errors.ville?.message}>
                  {(a) => <Input {...a} {...register('ville')} />}
                </ChampFormulaire>
                <ChampFormulaire libelle="Quartier" erreur={errors.quartierId?.message}>
                  {(a) => (
                    <select {...a} className={cn(champNatif, 'h-11')} {...register('quartierId')}>
                      <option value="">Non précisé</option>
                      {(quartiers.data ?? []).map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.commune} — {q.nom}
                        </option>
                      ))}
                    </select>
                  )}
                </ChampFormulaire>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Emplacement exact du bien</p>
                <SelecteurPointGps
                  valeur={latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null}
                  onChange={(p) => {
                    setValue('latitude', p.latitude, { shouldValidate: true })
                    setValue('longitude', p.longitude, { shouldValidate: true })
                  }}
                  erreur={errors.latitude?.message}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <ChampFormulaire libelle="Surface (m²)" erreur={errors.surface?.message}>
                  {(a) => <Input {...a} type="number" inputMode="decimal" min={0} {...register('surface')} />}
                </ChampFormulaire>
                <ChampFormulaire libelle="Pièces" erreur={errors.pieces?.message}>
                  {(a) => <Input {...a} type="number" inputMode="numeric" min={0} {...register('pieces')} />}
                </ChampFormulaire>
                <ChampFormulaire libelle="Salles de bain" erreur={errors.sallesDeBain?.message}>
                  {(a) => <Input {...a} type="number" inputMode="numeric" min={0} {...register('sallesDeBain')} />}
                </ChampFormulaire>
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-primary" {...register('meuble')} />
                Bien meublé
              </label>

              <ChampFormulaire libelle="Description" erreur={errors.description?.message}>
                {(a) => (
                  <textarea
                    {...a}
                    rows={5}
                    className={champNatif}
                    placeholder="État, environnement, conditions (caution, avance)…"
                    {...register('description')}
                  />
                )}
              </ChampFormulaire>

              {avantages.data && (
                <Controller
                  control={control}
                  name="avantages"
                  render={({ field }) => (
                    <SelecteurAvantages avantages={avantages.data} selection={field.value} onChange={field.onChange} />
                  )}
                />
              )}

              {depassement && e.prix_depassement !== null && (
                <AccordDepassement
                  prix={Number(e.prix_depassement)}
                  coche={accord}
                  onChange={(v) => setValue('accepteDepassement', v)}
                />
              )}

              {publication.isError && <Alert variant="erreur">{messageErreur(publication.error)}</Alert>}

              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="ghost" asChild>
                  <Link to="/annonces">Annuler</Link>
                </Button>
                <Button type="submit" disabled={publication.isPending || (depassement && !accord)}>
                  {publication.isPending ? 'Publication…' : 'Publier l\'annonce'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
