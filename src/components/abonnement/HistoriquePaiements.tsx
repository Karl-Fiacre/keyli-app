import { formatXof } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface Paiement {
  id: string
  date: string // ISO
  forfait: string | null
  montant: number
  statut: 'completed' | 'pending' | 'failed'
  reference: string | null
}

const STATUTS: Record<Paiement['statut'], { libelle: string; classe: string }> = {
  completed: { libelle: 'Payé', classe: 'bg-success/15 text-success-texte' },
  pending: { libelle: 'En attente', classe: 'bg-pending/15 text-pending-texte' },
  failed: { libelle: 'Échoué', classe: 'bg-destructive/10 text-destructive-texte' },
}

// Historique des paiements d'abonnement (transactions_keyli du compte).
// Défile horizontalement sur petit écran.
export function HistoriquePaiements({ paiements }: { paiements: Paiement[] }) {
  if (paiements.length === 0) return <p className="text-sm text-muted-foreground">Aucun paiement pour l'instant.</p>
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Date
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Forfait
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Montant
            </th>
            <th scope="col" className="py-2 pl-3 font-semibold">
              Statut
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {paiements.map((p) => (
            <tr key={p.id}>
              <td className="py-3 pr-3 tabular-nums">{new Date(p.date).toLocaleDateString('fr-FR')}</td>
              <td className="px-3 py-3">{p.forfait ?? '—'}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatXof(p.montant)}</td>
              <td className="py-3 pl-3">
                <span className={cn('rounded-pill px-2 py-0.5 text-xs font-semibold', STATUTS[p.statut].classe)}>
                  {STATUTS[p.statut].libelle}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
