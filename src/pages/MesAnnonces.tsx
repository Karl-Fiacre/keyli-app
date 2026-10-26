import { Link, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { useMesAnnonces } from '@/hooks/useAnnonces'
import { useAbonnementActif } from '@/hooks/useAbonnement'
import { messageErreur } from '@/lib/erreurs'
import { LIBELLES_TYPE } from '@/lib/validation'
import { formatXof } from '@/lib/format'

// Annonces du compte (publiées, masquées, archivées)
export default function MesAnnonces() {
  const annonces = useMesAnnonces()
  const abonnement = useAbonnementActif()
  const etat = useLocation().state as { publiee?: boolean } | null
  // Sans abonnement en cours, la base masque les annonces au public
  const masquees = !abonnement.isPending && !abonnement.data

  return (
    <section className="container py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Mes annonces</h1>
          <Button asChild>
            <Link to="/annonces/nouvelle">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Publier une annonce
            </Link>
          </Button>
        </div>

        {etat?.publiee && <Alert variant="succes">Annonce publiée : elle est visible dans les recherches.</Alert>}
        {masquees && (
          <Alert variant="erreur">
            Aucun abonnement en cours : vos annonces ne sont pas visibles du public.{' '}
            <Link to="/abonnement" className="font-semibold underline">
              Choisir un forfait
            </Link>
          </Alert>
        )}

        {annonces.isPending && <p className="text-muted-foreground">Chargement…</p>}
        {annonces.isError && <Alert variant="erreur">{messageErreur(annonces.error)}</Alert>}
        {annonces.data?.length === 0 && (
          <p className="text-muted-foreground">Vous n'avez pas encore publié d'annonce.</p>
        )}

        <ul className="space-y-3">
          {annonces.data?.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {LIBELLES_TYPE[a.type]} · {a.status === 'a_louer' ? 'À louer' : 'À vendre'} ·{' '}
                      {a.quartiers_keyli?.nom ? `${a.quartiers_keyli.nom}, ` : ''}
                      {a.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {formatXof(Number(a.price))}
                      {a.status === 'a_louer' && <span className="font-normal text-muted-foreground"> / mois</span>}
                    </span>
                    {a.is_verified && <VerifiedBadge />}
                    <span
                      className={
                        a.archived_at || masquees
                          ? 'rounded-pill bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground'
                          : 'rounded-pill bg-success/15 px-3 py-1 text-xs font-semibold text-success'
                      }
                    >
                      {a.archived_at ? 'Archivée' : masquees ? 'Masquée' : 'En ligne'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
