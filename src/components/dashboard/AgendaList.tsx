import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface RendezVous {
  id: string
  date: string // ISO
  titre: string // ex. « Villa Cocody »
  detail?: string // ex. « Aya Konan »
  vers?: string // page à ouvrir au clic (conversation, annonce)
  annule?: boolean
}

// Liste de rendez-vous avec pastille de date (KEYLI_DASHBOARD_DESIGN_SPEC.md
// §2 : visites à venir, Agence et Propriétaire). Heure d'Abidjan affichée
// selon le fuseau du navigateur ; aucune donnée en dur.
export function AgendaList({ rendezVous, vide = 'Aucune visite à venir.' }: { rendezVous: RendezVous[]; vide?: string }) {
  if (rendezVous.length === 0) return <p className="text-sm text-muted-foreground">{vide}</p>
  return (
    <ul className="divide-y">
      {rendezVous.map((r) => {
        const d = new Date(r.date)
        const contenu = (
          <>
            <span
              className={cn(
                'flex w-12 shrink-0 flex-col items-center rounded-lg py-1.5',
                r.annule ? 'bg-muted text-muted-foreground' : 'bg-secondary text-foreground',
              )}
              aria-hidden
            >
              <span className="text-lg font-bold leading-none tabular-nums">{d.getDate()}</span>
              <span className="text-[10px] font-semibold uppercase">{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-sm font-semibold', r.annule && 'line-through')}>{r.titre}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {d.toLocaleDateString('fr-FR', { weekday: 'long' })} {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                {r.detail && ` — ${r.detail}`}
                {r.annule && ' · annulée'}
              </span>
            </span>
          </>
        )
        return (
          <li key={r.id}>
            {r.vers ? (
              <Link to={r.vers} className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors duration-150 hover:bg-secondary/60">
                {contenu}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-1 py-3">{contenu}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
