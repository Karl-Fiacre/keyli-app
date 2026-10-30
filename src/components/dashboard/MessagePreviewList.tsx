import { Link } from 'react-router-dom'
import { initiales } from '@/lib/format'
import { ilYA } from '@/lib/notifications'
import { cn } from '@/lib/utils'

export interface ApercuMessage {
  id: string
  nom: string
  apercu: string
  date: string // ISO
  nouveau: boolean // non lu
  vers: string // conversation à ouvrir
}

// Liste de messages avec avatar, aperçu et badge « nouveau »
// (KEYLI_DASHBOARD_DESIGN_SPEC.md §2 — dashboards Propriétaire et Chercheur).
// Le badge apparaît avec un léger rebond (spec 5.3).
export function MessagePreviewList({ messages, vide = 'Aucun message pour l\'instant.' }: { messages: ApercuMessage[]; vide?: string }) {
  if (messages.length === 0) return <p className="text-sm text-muted-foreground">{vide}</p>
  return (
    <ul className="divide-y">
      {messages.map((m) => (
        <li key={m.id}>
          <Link to={m.vers} className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors duration-150 hover:bg-secondary/60">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-secondary text-xs font-bold text-foreground"
              aria-hidden
            >
              {initiales(m.nom)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className={cn('truncate text-sm', m.nouveau ? 'font-bold' : 'font-semibold')}>{m.nom}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{ilYA(m.date)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className={cn('truncate text-sm', m.nouveau ? 'text-foreground' : 'text-muted-foreground')}>{m.apercu}</span>
                {m.nouveau && (
                  <span className="kf-pastille-apparait shrink-0 rounded-pill bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                    Nouveau
                  </span>
                )}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
