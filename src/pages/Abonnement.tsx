import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAbonnementActif, useForfaits, usePaiementForfait, type Forfait } from '@/hooks/useAbonnement'
import { useProfil } from '@/hooks/useProfil'
import { cn } from '@/lib/utils'

// Choix et paiement d'un forfait (docs/MODULES/pricing.md). Les montants
// affichés viennent de plans_keyli ; le paiement est démarré côté serveur.
const formatXof = (v: number) => `${new Intl.NumberFormat('fr-FR').format(v)} XOF`

function libelleAnnonces(f: Forfait) {
  return f.seuil_max ? `${f.seuil_min} à ${f.seuil_max} annonces` : `${f.seuil_min} annonces et plus`
}

export default function Abonnement() {
  const profil = useProfil()
  const forfaits = useForfaits()
  const abonnement = useAbonnementActif()
  const paiement = usePaiementForfait()
  const role = profil.data?.role_keyli
  const actuel = abonnement.data

  if (profil.isPending || forfaits.isPending || abonnement.isPending) {
    return <p className="container py-16 text-center text-muted-foreground">Chargement…</p>
  }

  if (role !== 'owner' && role !== 'agency') {
    return (
      <section className="container flex justify-center py-12">
        <Alert className="max-w-lg">
          La recherche de logement est gratuite : aucun abonnement n'est nécessaire pour un compte chercheur.{' '}
          <Link to="/" className="font-semibold text-primary-glow hover:underline">Retour à l'accueil</Link>
        </Alert>
      </section>
    )
  }

  // Une agence ne peut pas prendre le forfait Propriétaire (règle aussi appliquée en base)
  const proposes = (forfaits.data ?? []).filter((f) => !(role === 'agency' && f.code === 'proprietaire'))

  const payer = (planId: string) =>
    paiement.mutate(planId, { onSuccess: ({ authorization_url }) => window.location.assign(authorization_url) })

  return (
    <section className="container py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mon abonnement</h1>
          {actuel ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Forfait <strong className="text-foreground">{actuel.plans_keyli?.nom}</strong> actif jusqu'au{' '}
              {new Date(actuel.end_date).toLocaleDateString('fr-FR')}. Payer le même forfait le prolonge d'un mois ;
              choisir un autre forfait l'applique immédiatement pour un nouveau mois.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Aucun abonnement actif : choisissez un forfait pour publier vos annonces. Paiement mensuel, sans engagement.
            </p>
          )}
        </div>

        {paiement.isError && <Alert variant="erreur">{paiement.error.message}</Alert>}

        <div className="grid gap-4 md:grid-cols-3">
          {proposes.map((f) => {
            const estActuel = actuel?.plan_id === f.id
            return (
              <Card
                key={f.id}
                className={cn(
                  'flex flex-col transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0',
                  estActuel && 'ring-2 ring-primary',
                )}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{f.nom}</CardTitle>
                  <CardDescription>{libelleAnnonces(f)}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  <p className="text-2xl font-bold">
                    {formatXof(Number(f.prix_mensuel))}
                    <span className="text-sm font-normal text-muted-foreground"> / mois</span>
                  </p>
                  {f.prix_depassement_unitaire !== null && (
                    <p className="text-xs text-muted-foreground">
                      Au-delà : {formatXof(Number(f.prix_depassement_unitaire))} par annonce, avec votre accord.
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={estActuel ? 'outline' : 'default'}
                    disabled={paiement.isPending}
                    onClick={() => payer(f.id)}
                  >
                    {paiement.isPending && paiement.variables === f.id
                      ? 'Redirection vers le paiement…'
                      : estActuel
                        ? 'Prolonger d\'un mois'
                        : actuel
                          ? 'Passer à ce forfait'
                          : 'Choisir ce forfait'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Paiement sécurisé par Paystack (carte bancaire, Mobile Money). Votre abonnement est activé dès la
          confirmation du paiement.
        </p>
      </div>
    </section>
  )
}
