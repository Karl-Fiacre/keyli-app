import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ConsommationForfait } from '@/components/abonnement/ConsommationForfait'
import { HistoriquePaiements } from '@/components/abonnement/HistoriquePaiements'
import {
  useAbonnementActif,
  useCycleEnCours,
  useDepassementsAPayer,
  useDernierAbonnementExpire,
  useForfaits,
  useHistoriquePaiements,
  usePaiementForfait,
  useRecommandationForfait,
  type Forfait,
} from '@/hooks/useAbonnement'
import { useEtatPublication } from '@/hooks/useAnnonces'
import { useProfil } from '@/hooks/useProfil'
import { cn } from '@/lib/utils'
import { formatXof } from '@/lib/format'

// Choix, paiement et suivi d'un forfait (docs/MODULES/pricing.md) pour les
// 3 paliers. Montants et compteurs viennent de la base ; le paiement est
// démarré côté serveur (le client n'envoie jamais de montant).
function libelleAnnonces(f: Forfait) {
  return f.seuil_max ? `${f.seuil_min} à ${f.seuil_max} annonces par mois` : `${f.seuil_min} annonces et plus par mois`
}

// Ce qui se passe au-delà du seuil, selon le forfait (règles PRD_REGLES.md)
function regleDepassement(f: Forfait) {
  if (f.prix_depassement_unitaire !== null) {
    const base = `Au-delà : ${formatXof(Number(f.prix_depassement_unitaire))} par annonce et par mois, avec votre accord.`
    return f.code === 'grande_agence' ? `${base} Formule personnalisée possible sur demande.` : base
  }
  return f.seuil_max ? `Pas de dépassement à l'unité : au-delà de ${f.seuil_max}, passez au forfait supérieur.` : null
}

const JOUR = 86_400_000

export default function Abonnement() {
  const profil = useProfil()
  const forfaits = useForfaits()
  const abonnement = useAbonnementActif()
  const paiement = usePaiementForfait()
  const role = profil.data?.role_keyli
  const publie = role === 'owner' || role === 'agency'
  const actuel = abonnement.data
  const expire = useDernierAbonnementExpire(!!actuel || abonnement.isPending).data
  const depassements = useDepassementsAPayer().data ?? []
  const etat = useEtatPublication().data
  const cycle = useCycleEnCours(actuel).data
  const historique = useHistoriquePaiements().data ?? []
  const recommandation = useRecommandationForfait().data
  const [aConfirmer, setAConfirmer] = useState<string | null>(null)
  const totalDepassements = depassements.reduce((s, d) => s + Number(d.montant), 0)

  if (profil.isPending || forfaits.isPending || abonnement.isPending) {
    return <p className="container py-16 text-center text-muted-foreground">Chargement…</p>
  }

  if (!publie) {
    return (
      <section className="container flex justify-center py-12">
        <Alert className="max-w-lg">
          La recherche de logement est gratuite : aucun abonnement n'est nécessaire pour un compte chercheur.{' '}
          <Link to="/" className="font-semibold text-primary-glow hover:underline">
            Retour à l'accueil
          </Link>
        </Alert>
      </section>
    )
  }

  // Une agence ne peut pas prendre le forfait Propriétaire (règle aussi appliquée en base)
  const proposes = (forfaits.data ?? []).filter((f) => !(role === 'agency' && f.code === 'proprietaire'))
  // Jours de l'abonnement en cours perdus en cas de changement (sans prorata)
  const joursRestants = actuel ? Math.max(0, Math.ceil((new Date(actuel.end_date).getTime() - Date.now()) / JOUR)) : 0
  // Une recommandation antérieure au forfait actuel est déjà suivie
  const recoActuelle =
    recommandation && (!actuel || new Date(recommandation.created_at) > new Date(actuel.start_date))
      ? recommandation
      : null

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
              Aucun abonnement actif : choisissez un forfait pour publier vos annonces. Paiement mensuel, sans
              engagement.
            </p>
          )}
        </div>

        {!actuel && expire && (
          <Alert variant="erreur">
            Votre forfait {expire.plans_keyli?.nom} a expiré le {new Date(expire.end_date).toLocaleDateString('fr-FR')}{' '}
            : vos annonces ne sont plus visibles du public. Renouvelez votre abonnement pour les remettre en ligne
            immédiatement.
          </Alert>
        )}

        {recoActuelle && (
          <Alert>
            <p className="font-semibold">{recoActuelle.titre}</p>
            {recoActuelle.contenu && <p className="mt-1 text-sm text-muted-foreground">{recoActuelle.contenu}</p>}
          </Alert>
        )}

        {actuel && etat && (
          <ConsommationForfait
            forfait={actuel.plans_keyli?.nom ?? ''}
            publications={etat.publications_cycle}
            seuil={etat.seuil_max}
            prixDepassement={etat.prix_depassement === null ? null : Number(etat.prix_depassement)}
            finCycle={cycle?.fin ?? null}
            finAbonnement={actuel.end_date}
          />
        )}

        {totalDepassements > 0 && (
          <Alert>
            <p>
              Dépassements de forfait à régler : <strong>{formatXof(totalDepassements)}</strong>, ajoutés à votre
              prochain paiement.
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              {depassements.map((d) => (
                <li key={d.id}>
                  Du {new Date(d.cycle_debut).toLocaleDateString('fr-FR')} au{' '}
                  {new Date(d.cycle_fin).toLocaleDateString('fr-FR')} : {d.nb_depassement} annonce(s) au-delà du seuil —{' '}
                  {formatXof(Number(d.montant))}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {paiement.isError && <Alert variant="erreur">{paiement.error.message}</Alert>}

        <div className={cn('grid grid-cols-1 gap-4', proposes.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
          {proposes.map((f) => {
            const estActuel = actuel?.plan_id === f.id
            const confirmation = aConfirmer === f.id
            const total = Number(f.prix_mensuel) + totalDepassements
            const regle = regleDepassement(f)
            return (
              <Card
                key={f.id}
                className={cn(
                  'flex flex-col transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0',
                  estActuel && 'ring-2 ring-primary',
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{f.nom}</CardTitle>
                    {estActuel && (
                      <span className="rounded-pill bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        Actuel
                      </span>
                    )}
                  </div>
                  <CardDescription>{libelleAnnonces(f)}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  <p className="text-2xl font-bold">
                    {formatXof(Number(f.prix_mensuel))}
                    <span className="text-sm font-normal text-muted-foreground"> / mois</span>
                  </p>
                  {regle && <p className="text-xs text-muted-foreground">{regle}</p>}
                  {totalDepassements > 0 && (
                    <p className="text-xs text-muted-foreground">
                      À payer maintenant : {formatXof(total)} (dépassements inclus)
                    </p>
                  )}
                  {confirmation && actuel && (
                    <div className="rounded-lg border border-pending/40 bg-pending/10 p-3 text-xs" role="alert">
                      Changement immédiat : votre forfait {actuel.plans_keyli?.nom} s'arrête aujourd'hui
                      {joursRestants > 0
                        ? ` (${joursRestants} jour${joursRestants > 1 ? 's' : ''} non utilisé${joursRestants > 1 ? 's' : ''}, sans remboursement)`
                        : ''}{' '}
                      et le forfait {f.nom} démarre pour un mois. Montant : {formatXof(total)}.
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  {confirmation ? (
                    <>
                      <Button className="w-full" disabled={paiement.isPending} onClick={() => payer(f.id)}>
                        {paiement.isPending ? 'Redirection vers le paiement…' : 'Confirmer et payer'}
                      </Button>
                      <Button
                        className="w-full"
                        variant="ghost"
                        disabled={paiement.isPending}
                        onClick={() => setAConfirmer(null)}
                      >
                        Annuler
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full"
                      variant={estActuel ? 'outline' : 'default'}
                      disabled={paiement.isPending}
                      // Changer de forfait en cours d'abonnement se confirme d'abord
                      onClick={() => (actuel && !estActuel ? setAConfirmer(f.id) : payer(f.id))}
                    >
                      {paiement.isPending && paiement.variables === f.id
                        ? 'Redirection vers le paiement…'
                        : estActuel
                          ? "Prolonger d'un mois"
                          : actuel
                            ? 'Passer à ce forfait'
                            : 'Choisir ce forfait'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Paiement sécurisé par Paystack (carte bancaire, Mobile Money). Votre abonnement est activé dès la confirmation
          du paiement.
        </p>

        <section className="space-y-3 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Historique des paiements</h2>
          <HistoriquePaiements
            paiements={historique.map((t) => ({
              id: t.id,
              date: t.created_at ?? '',
              forfait: t.subscriptions_keyli?.plans_keyli?.nom ?? null,
              montant: Number(t.amount),
              statut: t.status ?? 'pending',
              reference: t.paystack_ref,
            }))}
          />
        </section>
      </div>
    </section>
  )
}
