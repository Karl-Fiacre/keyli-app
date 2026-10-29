import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChampFormulaire } from '@/components/ChampFormulaire'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { SectionVerification } from '@/components/verification/SectionVerification'
import { useModificationProfil, useProfil } from '@/hooks/useProfil'
import { messageErreur } from '@/lib/erreurs'
import { schemaProfil, type DonneesProfil } from '@/lib/validation'

const LIBELLES_ROLE: Record<string, string> = {
  user: 'Chercheur de logement',
  owner: 'Propriétaire',
  agency: 'Agence',
  admin: 'Administrateur',
  super_admin: 'Super administrateur',
}

export default function Profil() {
  const profil = useProfil()
  const modification = useModificationProfil()
  const p = profil.data
  const estAgence = p?.role_keyli === 'agency'
  // Nom d'agence figé une fois l'agence vérifiée (règle appliquée en base)
  const nomAgenceModifiable = estAgence && !p?.verified

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<DonneesProfil>({ resolver: zodResolver(schemaProfil) })

  useEffect(() => {
    if (p) {
      reset({ prenom: p.first_name ?? '', nom: p.last_name ?? '', telephone: p.phone ?? '', nomAgence: p.nom_agence ?? '' })
    }
  }, [p, reset])

  if (profil.isPending) return <p className="container py-16 text-center text-muted-foreground">Chargement…</p>
  if (profil.isError || !p) {
    return (
      <section className="container py-12">
        <Alert variant="erreur">{messageErreur(profil.error)}</Alert>
      </section>
    )
  }

  const envoyer = handleSubmit((d) =>
    modification.mutate({
      first_name: d.prenom,
      last_name: d.nom,
      phone: d.telephone || null,
      ...(nomAgenceModifiable && d.nomAgence ? { nom_agence: d.nomAgence } : {}),
    }),
  )

  return (
    <section className="container flex justify-center py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Mon profil</CardTitle>
            {p.verified ? (
              <VerifiedBadge />
            ) : (
              <span className="rounded-pill bg-pending/15 px-3 py-1 text-xs font-semibold text-pending">Non vérifié</span>
            )}
          </div>
          <CardDescription>
            {LIBELLES_ROLE[p.role_keyli] ?? p.role_keyli} · {p.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {p.suspendu && (
            <Alert variant="erreur" className="mb-5">
              Votre compte est suspendu{p.suspension_motif ? ` : ${p.suspension_motif}` : ''}.
            </Alert>
          )}
          <form onSubmit={envoyer} noValidate className="space-y-5">
            {estAgence && (
              <ChampFormulaire libelle="Nom de l'agence" erreur={errors.nomAgence?.message}
                aide={!nomAgenceModifiable && (
                  <p className="text-xs text-muted-foreground">Agence vérifiée : le nom ne se modifie plus que sur demande à l'équipe Keyli.</p>
                )}>
                {(a) => <Input {...a} disabled={!nomAgenceModifiable} {...register('nomAgence')} />}
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
              {(a) => <Input {...a} type="tel" autoComplete="tel" {...register('telephone')} />}
            </ChampFormulaire>

            {modification.isSuccess && !isDirty && <Alert variant="succes">Profil enregistré.</Alert>}
            {modification.isError && <Alert variant="erreur">{messageErreur(modification.error)}</Alert>}

            <Button type="submit" disabled={modification.isPending || !isDirty}>
              {modification.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
          {(p.role_keyli === 'owner' || p.role_keyli === 'agency') && (
            <div className="mt-8 border-t pt-6">
              <SectionVerification role={p.role_keyli} verifie={!!p.verified} />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
