import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { useIndicateurs } from '@/hooks/useAdmin'
import { messageErreur } from '@/lib/erreurs'
import { formatXof } from '@/lib/format'

// Cibles du pilote (PRD §4.2, docs/MODULES/admin.md) — aucun autre seuil
const CIBLE_VERIFICATION = 70
const CIBLE_NOTE = 4
const CIBLE_ANNONCES = 500

const nombre = (v: number | string | null | undefined) => new Intl.NumberFormat('fr-FR').format(Number(v ?? 0))

export default function AdminIndicateurs() {
  const indicateurs = useIndicateurs()
  if (indicateurs.isPending) return <p className="text-muted-foreground">Chargement…</p>
  if (indicateurs.isError) return <Alert variant="erreur">{messageErreur(indicateurs.error)}</Alert>
  const i = indicateurs.data

  const taux = i.taux_verification === null ? null : Number(i.taux_verification)
  const note = i.note_moyenne === null ? null : Number(i.note_moyenne)
  const annonces = Number(i.annonces_visibles)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Objectifs du pilote</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            libelle="Annonceurs vérifiés"
            nombre={taux}
            formater={(n) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`}
            rang={0}
            detail={`${nombre(i.annonceurs_verifies)} sur ${nombre(Number(i.proprietaires) + Number(i.agences))} propriétaires et agences`}
            cible={`≥ ${CIBLE_VERIFICATION} %`}
            atteinte={taux === null ? null : taux >= CIBLE_VERIFICATION}
          />
          <KpiCard
            libelle="Note moyenne"
            nombre={note}
            formater={(n) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} / 5`}
            rang={1}
            detail={`${nombre(i.avis)} avis publiés`}
            cible={`≥ ${CIBLE_NOTE.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} / 5`}
            atteinte={note === null ? null : note >= CIBLE_NOTE}
          />
          <KpiCard
            libelle="Annonces visibles"
            nombre={annonces}
            rang={2}
            detail={`${nombre(i.annonces_publiees)} publiées, dont ${nombre(i.annonces_verifiees)} vérifiées`}
            cible={`${CIBLE_ANNONCES} propriétés`}
            atteinte={annonces >= CIBLE_ANNONCES}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">À traiter</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/admin/verifications" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <KpiCard libelle="Documents en attente" nombre={Number(i.documents_en_attente)} detail="Ouvrir la file de vérification" rang={3} />
          </Link>
          <Link to="/admin/signalements" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <KpiCard libelle="Signalements en attente" nombre={Number(i.signalements_en_attente)} detail="Ouvrir la file de modération" rang={4} />
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Activité</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            libelle="Comptes"
            nombre={Number(i.comptes_total)}
            rang={5}
            detail={`${nombre(i.chercheurs)} chercheurs · ${nombre(i.proprietaires)} propriétaires · ${nombre(i.agences)} agences`}
          />
          <KpiCard libelle="Abonnements en cours" nombre={Number(i.abonnements_actifs)} rang={6} />
          <KpiCard libelle="Inscriptions (30 j)" nombre={Number(i.inscriptions_30j)} rang={7} />
          <KpiCard libelle="Encaissé (30 j)" nombre={Number(i.encaisse_30j)} formater={(n) => formatXof(Math.round(n))} rang={8} />
          <KpiCard libelle="Vues d'annonces (30 j)" nombre={Number(i.vues_30j)} rang={9} />
          <KpiCard libelle="Premiers contacts (30 j)" nombre={Number(i.contacts_30j)} rang={10} />
        </div>
      </div>
    </div>
  )
}
