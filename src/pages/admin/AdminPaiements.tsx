import { useState } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import {
  useControlesPaiements,
  usePaiementsAdmin,
  useSynthesePaiements,
  useVerifierPaiement,
} from '@/hooks/usePaiementsAdmin'
import { messageErreur } from '@/lib/erreurs'
import { formatXof } from '@/lib/format'
import { LIBELLES_TENTATIVE, motifRefus, type StatutTentative } from '@/lib/paiements'
import { cn } from '@/lib/utils'

const jourIso = (d: Date) => d.toISOString().slice(0, 10)
const ilYA = (jours: number) => jourIso(new Date(Date.now() - jours * 86_400_000))

const CLASSES_STATUT: Record<StatutTentative, string> = {
  success: 'bg-success/15 text-success-texte',
  initiated: 'bg-pending/15 text-pending-texte',
  failed: 'bg-destructive/10 text-destructive-texte',
  abandoned: 'bg-muted text-muted-foreground',
}

const FILTRES: { valeur: StatutTentative | null; libelle: string }[] = [
  { valeur: null, libelle: 'Tous' },
  { valeur: 'initiated', libelle: 'En cours' },
  { valeur: 'failed', libelle: 'Échoués' },
  { valeur: 'abandoned', libelle: 'Abandonnés' },
  { valeur: 'success', libelle: 'Réussis' },
]

// Suivi des paiements (Sprint 9, docs/MODULES/paiements.md) : synthèse de la
// période, contrôles de fiabilité (chacun doit valoir 0), derniers paiements
// avec vérification immédiate auprès de Paystack.
export default function AdminPaiements() {
  const [periode, setPeriode] = useState({ debut: ilYA(29), fin: jourIso(new Date()) })
  const [filtre, setFiltre] = useState<StatutTentative | null>(null)
  const synthese = useSynthesePaiements(periode.debut, periode.fin)
  const controles = useControlesPaiements()
  const liste = usePaiementsAdmin(filtre)
  const verifier = useVerifierPaiement()
  const s = synthese.data
  const enAnomalie = (controles.data ?? []).filter((c) => c.nombre > 0)

  return (
    <div className="space-y-8">
      <fieldset className="max-w-md rounded-lg border bg-card p-4">
        <legend className="px-1 text-sm font-semibold">Période</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            Du
            <Input
              type="date"
              value={periode.debut}
              max={periode.fin}
              onChange={(e) => setPeriode({ ...periode, debut: e.target.value })}
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            Au
            <Input
              type="date"
              value={periode.fin}
              min={periode.debut}
              onChange={(e) => setPeriode({ ...periode, fin: e.target.value })}
            />
          </label>
        </div>
      </fieldset>

      {synthese.isError && <Alert variant="erreur">{messageErreur(synthese.error)}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          libelle="Encaissé"
          nombre={s ? Number(s.encaisse) : null}
          formater={(n) => formatXof(n)}
          detail="Transactions confirmées"
          rang={0}
        />
        <KpiCard libelle="Paiements réussis" nombre={s ? Number(s.reussis) : null} rang={1} />
        <KpiCard libelle="Échoués" nombre={s ? Number(s.echoues) : null} detail="Refus ou incohérence" rang={2} />
        <KpiCard libelle="Abandonnés" nombre={s ? Number(s.abandonnes) : null} detail="Non finalisés" rang={3} />
        <KpiCard libelle="En cours" nombre={s ? Number(s.en_cours) : null} detail="Vérifiés automatiquement" rang={4} />
      </div>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Contrôles de fiabilité (24 dernières heures)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recalculés chaque heure par la surveillance : une échéance oubliée est traitée aussitôt, toute anomalie est
          inscrite dans l'onglet Erreurs.
        </p>
        {controles.isError && (
          <Alert variant="erreur" className="mt-3">
            {messageErreur(controles.error)}
          </Alert>
        )}
        {controles.isPending && <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>}
        {controles.data && (
          <>
            <p
              className={cn(
                'mt-3 flex items-center gap-2 text-sm font-semibold',
                enAnomalie.length ? 'text-destructive-texte' : 'text-success-texte',
              )}
            >
              {enAnomalie.length ? (
                <AlertTriangle className="h-4 w-4" aria-hidden />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              )}
              {enAnomalie.length
                ? `${enAnomalie.length} contrôle${enAnomalie.length > 1 ? 's' : ''} en anomalie`
                : 'Aucune anomalie'}
            </p>
            <ul className="mt-3 divide-y text-sm">
              {controles.data.map((c) => (
                <li key={c.controle} className="flex items-center justify-between gap-4 py-2">
                  <span>{c.libelle}</span>
                  <span
                    className={cn(
                      'tabular-nums font-semibold',
                      c.nombre > 0 ? 'text-destructive-texte' : 'text-muted-foreground',
                    )}
                  >
                    {c.nombre}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Derniers paiements</h2>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrer par statut">
            {FILTRES.map((f) => (
              <Button
                key={f.libelle}
                size="sm"
                variant={filtre === f.valeur ? 'default' : 'outline'}
                aria-pressed={filtre === f.valeur}
                onClick={() => setFiltre(f.valeur)}
              >
                {f.libelle}
              </Button>
            ))}
          </div>
        </div>

        {verifier.isError && (
          <Alert variant="erreur" className="mt-3">
            {verifier.error.message}
          </Alert>
        )}
        {verifier.isSuccess && (
          <Alert variant="succes" className="mt-3">
            {verifier.data}
          </Alert>
        )}
        {liste.isError && (
          <Alert variant="erreur" className="mt-3">
            {messageErreur(liste.error)}
          </Alert>
        )}
        {liste.isPending && <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>}
        {liste.data && liste.data.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Aucun paiement pour ce filtre.</p>
        )}
        {liste.data && liste.data.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Compte</th>
                  <th className="px-2 py-2 font-medium">Forfait</th>
                  <th className="px-2 py-2 text-right font-medium">Montant</th>
                  <th className="px-2 py-2 font-medium">Statut</th>
                  <th className="px-2 py-2 font-medium">Détail</th>
                  <th className="py-2 pl-2 font-medium">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {liste.data.map((p) => {
                  const statut = p.statut as StatutTentative
                  const verifiable = statut === 'initiated' || statut === 'failed'
                  return (
                    <tr key={p.id} className="border-b align-top last:border-0">
                      <td className="py-2 pr-2 tabular-nums">
                        {new Date(p.cree_le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="max-w-[12rem] truncate px-2 py-2" title={p.email ?? undefined}>
                        {p.email ?? '—'}
                      </td>
                      <td className="px-2 py-2">{p.forfait ?? '—'}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatXof(Number(p.montant))}</td>
                      <td className="px-2 py-2">
                        <span
                          className={cn(
                            'rounded-pill px-2 py-0.5 text-xs font-semibold',
                            CLASSES_STATUT[statut] ?? 'bg-muted',
                          )}
                        >
                          {LIBELLES_TENTATIVE[statut] ?? p.statut}
                        </span>
                      </td>
                      <td className="max-w-[16rem] px-2 py-2 text-xs text-muted-foreground">
                        {p.motif_refus ? motifRefus(p.motif_refus) : (p.message ?? '')}
                        {p.verifications > 0 && (
                          <span className="block">
                            {p.verifications} vérification{p.verifications > 1 ? 's' : ''} auprès de Paystack
                            {p.derniere_verification
                              ? `, la dernière le ${new Date(p.derniere_verification).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
                              : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pl-2">
                        {verifiable && p.reference && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={verifier.isPending}
                            onClick={() => verifier.mutate(p.reference)}
                          >
                            {verifier.isPending && verifier.variables === p.reference ? 'Vérification…' : 'Vérifier'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
