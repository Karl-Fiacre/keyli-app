// Abonnement — forfait, échéance, dernier paiement et dépassements, en
// lecture seule sur Android comme sur iPhone (décision du porteur du
// 2026-11-20) : le paiement des forfaits se fait sur le site, jamais dans
// l'application — ni bouton de paiement ni lien d'achat, conformément aux
// règles de paiement de Google Play et de l'App Store (3.1.1). Mêmes hooks
// que la page web.
import {
  useAbonnementActif,
  useDepassementsAPayer,
  useDerniereTentativePaiement,
  useDernierAbonnementExpire,
} from '@/partage/hooks/useAbonnement'
import { useProfil } from '@/partage/hooks/useProfil'
import { formatXof } from '@/partage/lib/format'
import { motifRefus } from '@/partage/lib/paiements'
import { Carte, Chargement, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { espaces } from '@mobile/theme/tokens'

const JOUR = 86_400_000

function date(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function Abonnement() {
  const profil = useProfil()
  const abonnement = useAbonnementActif()
  const actuel = abonnement.data
  const expire = useDernierAbonnementExpire(!!actuel || abonnement.isPending).data
  const depassements = useDepassementsAPayer().data ?? []
  const derniere = useDerniereTentativePaiement().data

  if (profil.isPending || abonnement.isPending) return <Chargement />

  const role = profil.data?.role_keyli
  if (role !== 'owner' && role !== 'agency') {
    return (
      <Ecran>
        <Titre>Abonnement</Titre>
        <Texte>La recherche de logement est gratuite : aucun abonnement n'est nécessaire pour un compte chercheur.</Texte>
      </Ecran>
    )
  }

  const totalDepassements = depassements.reduce((s, d) => s + Number(d.montant), 0)
  const joursRestants = actuel ? Math.max(0, Math.ceil((new Date(actuel.end_date).getTime() - Date.now()) / JOUR)) : 0
  // Paiement refusé récemment (moins de 7 jours) et pas encore retenté
  const refus =
    derniere?.status === 'failed' && Date.now() - new Date(derniere.created_at ?? 0).getTime() < 7 * JOUR
      ? derniere
      : null

  return (
    <Ecran>
      <Titre>Mon abonnement</Titre>
      {actuel ? (
        <Carte style={{ gap: espaces.xs }}>
          <Texte>Forfait {actuel.plans_keyli?.nom}</Texte>
          <Texte attenue>
            Actif jusqu'au {date(actuel.end_date)}
            {joursRestants > 0 ? ` (${joursRestants} jour${joursRestants > 1 ? 's' : ''})` : ''}
          </Texte>
        </Carte>
      ) : (
        <Texte attenue>Aucun abonnement actif : vos annonces ne sont pas visibles du public.</Texte>
      )}

      {!actuel && expire ? (
        <Message>
          Votre forfait {expire.plans_keyli?.nom} a expiré le {date(expire.end_date)} : vos annonces ne sont plus
          visibles du public.
        </Message>
      ) : null}

      {refus ? (
        <Message>
          Votre dernier paiement ({formatXof(Number(refus.amount))}, forfait {refus.plans_keyli?.nom ?? 'choisi'}) n'a
          pas abouti. {motifRefus(refus.motif_refus)} Votre abonnement n'a pas été modifié.
        </Message>
      ) : null}

      {totalDepassements > 0 ? (
        <Message>
          Dépassements de forfait à régler : {formatXof(totalDepassements)}, ajoutés au prochain paiement.
        </Message>
      ) : null}
    </Ecran>
  )
}
