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
            valeur={taux === null ? '—' : `${taux.toLocaleString('fr-FR')} %`}
            detail={`${nombre(i.annonceurs_verifies)} sur ${nombre(Number(i.proprietaires) + Number(i.agences))} propriétaires et agences`}
            cible={`≥ ${CIBLE_VERIFICATION} %`}
            atteinte={taux === null ? null : taux >= CIBLE_VERIFICATION}
          />
          <KpiCard
            libelle="Note moyenne"
            valeur={note === null ? '—' : `${note.toLocaleString('fr-FR')} / 5`}
            detail={`${nombre(i.avis)} avis publiés`}
            cible={`≥ ${CIBLE_NOTE.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} / 5`}
            atteinte={note === null ? null : note >= CIBLE_NOTE}
          />
          <KpiCard
            libelle="Annonces visibles"
            valeur={nombre(annonces)}
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
            <KpiCard libelle="Documents en attente" valeur={nombre(i.documents_en_attente)} detail="Ouvrir la file de vérification" />
          </Link>
          <Link to="/admin/signalements" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <KpiCard libelle="Signalements en attente" valeur={nombre(i.signalements_en_attente)} detail="Ouvrir la file de modération" />
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Activité</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            libelle="Comptes"
            valeur={nombre(i.comptes_total)}
            detail={`${nombre(i.chercheurs)} chercheurs · ${nombre(i.proprietaires)} propriétaires · ${nombre(i.agences)} agences`}
          />
          <KpiCard libelle="Abonnements en cours" valeur={nombre(i.abonnements_actifs)} />
          <KpiCard libelle="Inscriptions (30 j)" valeur={nombre(i.inscriptions_30j)} />
          <KpiCard libelle="Encaissé (30 j)" valeur={formatXof(Number(i.encaisse_30j))} />
          <KpiCard libelle="Vues d'annonces (30 j)" valeur={nombre(i.vues_30j)} />
          <KpiCard libelle="Premiers contacts (30 j)" valeur={nombre(i.contacts_30j)} />
        </div>
      </div>
    </div>
  )
}
