import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { DonutChart } from '@/components/dashboard/DonutChart'
import { TrendBar } from '@/components/dashboard/TrendBar'
import { useActiviteQuotidienne, useIndicateurs } from '@/hooks/useAdmin'
import { messageErreur } from '@/lib/erreurs'
import { formatXof } from '@/lib/format'

// Cibles du pilote (PRD §4.2, docs/MODULES/admin.md) — aucun autre seuil
const CIBLE_VERIFICATION = 70
const CIBLE_NOTE = 4
const CIBLE_ANNONCES = 500

const nombre = (v: number | string | null | undefined) => new Intl.NumberFormat('fr-FR').format(Number(v ?? 0))

export default function AdminIndicateurs() {
  const indicateurs = useIndicateurs()
  const activite = useActiviteQuotidienne().data ?? []
  const serie = (cle: 'inscriptions' | 'vues' | 'contacts') => activite.map((j) => Number(j[cle]))
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 font-semibold">Progression vers les objectifs</h2>
          <div className="space-y-4">
            <TrendBar
              libelle="Annonceurs vérifiés (cible 70 %)"
              pourcentage={taux === null ? 0 : (taux / CIBLE_VERIFICATION) * 100}
              valeurAffichee={taux === null ? '—' : `${taux.toLocaleString('fr-FR')} % / ${CIBLE_VERIFICATION} %`}
              couleur={taux !== null && taux >= CIBLE_VERIFICATION ? 'hsl(var(--success))' : 'hsl(var(--primary-glow))'}
              rang={0}
            />
            <TrendBar
              libelle="Annonces visibles (cible 500)"
              pourcentage={(annonces / CIBLE_ANNONCES) * 100}
              valeurAffichee={`${nombre(annonces)} / ${CIBLE_ANNONCES}`}
              couleur={annonces >= CIBLE_ANNONCES ? 'hsl(var(--success))' : 'hsl(var(--primary-glow))'}
              rang={1}
            />
            <TrendBar
              libelle="Note moyenne (cible 4,0 / 5)"
              pourcentage={note === null ? 0 : (note / CIBLE_NOTE) * 100}
              valeurAffichee={note === null ? '—' : `${note.toLocaleString('fr-FR')} / 5`}
              couleur={note !== null && note >= CIBLE_NOTE ? 'hsl(var(--success))' : 'hsl(var(--primary-glow))'}
              rang={2}
            />
          </div>
        </section>
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 font-semibold">Comptes par profil</h2>
          <DonutChart
            titreCentre="comptes"
            segments={[
              { libelle: 'Chercheurs', valeur: Number(i.chercheurs), couleur: 'hsl(var(--primary-glow))' },
              { libelle: 'Propriétaires', valeur: Number(i.proprietaires), couleur: 'hsl(var(--turquoise))' },
              { libelle: 'Agences', valeur: Number(i.agences), couleur: 'hsl(var(--primary))' },
            ]}
          />
        </section>
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
          <KpiCard libelle="Inscriptions (30 j)" nombre={Number(i.inscriptions_30j)} rang={7} serie={serie('inscriptions')} />
          <KpiCard libelle="Encaissé (30 j)" nombre={Number(i.encaisse_30j)} formater={(n) => formatXof(Math.round(n))} rang={8} />
          <KpiCard libelle="Vues d'annonces (30 j)" nombre={Number(i.vues_30j)} rang={9} serie={serie('vues')} />
          <KpiCard libelle="Premiers contacts (30 j)" nombre={Number(i.contacts_30j)} rang={10} serie={serie('contacts')} />
        </div>
      </div>
    </div>
  )
}
