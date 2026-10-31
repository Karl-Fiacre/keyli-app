import { useId } from 'react'
import { Link } from 'react-router-dom'
import { ilYA } from '@/lib/notifications'
import { ETAPES_LEAD, type EtapeLead } from '@/lib/dashboard'

export type { EtapeLead }

export interface Lead {
  id: string
  contact: string // nom du chercheur ou du contact hors plateforme
  bien: string // titre de l'annonce
  etape: EtapeLead
  derniereActivite: string // ISO
  agent?: string | null // agent assigné (agence)
  agentId?: string | null
  vers?: string | null // conversation, si le contact a un compte Keyli
}

// Carte d'un lead dans le pipeline (KEYLI_DASHBOARD_DESIGN_SPEC.md §2).
// Décision du porteur (2026-10-30) : l'étape se change par un MENU, pas par
// glisser-déposer (aucune dépendance @dnd-kit / Framer Motion). Survol :
// léger soulèvement (kf-souleve).
export function LeadCard({
  lead,
  onChangerEtape,
  enCours = false,
  agents,
  onAssigner,
}: {
  lead: Lead
  onChangerEtape?: (etape: EtapeLead) => void
  enCours?: boolean // changement d'étape en cours d'enregistrement
  agents?: Array<{ id: string; nom: string }> // agents actifs de l'agence
  onAssigner?: (agentId: string | null) => void
}) {
  const idMenu = useId()
  const idAgent = useId()
  // Agent assigné mais désactivé depuis : il reste affiché dans le menu
  const options =
    lead.agentId && agents && !agents.some((a) => a.id === lead.agentId)
      ? [...agents, { id: lead.agentId, nom: lead.agent ?? 'Agent' }]
      : agents
  return (
    <article className="kf-souleve space-y-2 rounded-lg border bg-card p-3 shadow-sm">
      <div>
        {lead.vers ? (
          <Link to={lead.vers} className="block truncate text-sm font-semibold hover:underline">
            {lead.contact}
          </Link>
        ) : (
          <p className="truncate text-sm font-semibold">{lead.contact}</p>
        )}
        <p className="truncate text-xs text-muted-foreground">{lead.bien}</p>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{ilYA(lead.derniereActivite)}</span>
        {lead.agent && (
          <span className="truncate rounded-pill bg-purple/10 px-2 py-0.5 font-medium text-purple">{lead.agent}</span>
        )}
      </div>
      {onChangerEtape && (
        <div>
          <label htmlFor={idMenu} className="sr-only">
            Étape du lead {lead.contact}
          </label>
          <select
            id={idMenu}
            value={lead.etape}
            disabled={enCours}
            onChange={(e) => onChangerEtape(e.target.value as EtapeLead)}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            {ETAPES_LEAD.map((e) => (
              <option key={e.code} value={e.code}>
                {e.libelle}
              </option>
            ))}
          </select>
        </div>
      )}
      {onAssigner && options && options.length > 0 && (
        <div>
          <label htmlFor={idAgent} className="sr-only">
            Agent chargé du lead {lead.contact}
          </label>
          <select
            id={idAgent}
            value={lead.agentId ?? ''}
            disabled={enCours}
            onChange={(e) => onAssigner(e.target.value || null)}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <option value="">Aucun agent</option>
            {options.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
        </div>
      )}
    </article>
  )
}
