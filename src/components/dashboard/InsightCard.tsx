import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TypeInsight = 'warn' | 'ok' | 'neutre'

const STYLES: Record<TypeInsight, { bordure: string; icone: typeof Lightbulb; couleur: string; libelle: string }> = {
  warn: { bordure: 'border-l-pending', icone: AlertTriangle, couleur: 'text-pending', libelle: 'À surveiller' },
  ok: { bordure: 'border-l-success', icone: CheckCircle2, couleur: 'text-success', libelle: 'Bonne pratique' },
  neutre: { bordure: 'border-l-purple', icone: Lightbulb, couleur: 'text-purple', libelle: 'Opportunité' },
}

// Carte de conseil à bordure gauche colorée selon le type (KEYLI_DASHBOARD_DESIGN_SPEC.md
// §2, dashboard Agence). Les conseils viennent de règles simples documentées
// (MODULES/dashboard.md) — jamais de texte inventé ici. Apparition : glissement
// depuis la gauche (spec 5.3).
export function InsightCard({
  type,
  titre,
  texte,
  action,
  rang = 0,
}: {
  type: TypeInsight
  titre: string
  texte: string
  action?: { libelle: string; vers: string }
  rang?: number
}) {
  const s = STYLES[type]
  const Icone = s.icone
  return (
    <article
      className={cn('kf-glisse-gauche flex gap-3 rounded-lg border border-l-4 bg-card p-4', s.bordure)}
      style={{ animationDelay: `${rang * 60}ms` } as CSSProperties}
    >
      <Icone className={cn('mt-0.5 h-5 w-5 shrink-0', s.couleur)} aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className={cn('text-[11px] font-semibold uppercase tracking-wider', s.couleur)}>{s.libelle}</p>
        <p className="font-semibold">{titre}</p>
        <p className="text-sm text-muted-foreground">{texte}</p>
        {action &&
          // Ancre dans la page (#pipeline) : lien simple, qui fait défiler
          (action.vers.startsWith('#') ? (
            <a href={action.vers} className="inline-block pt-1 text-sm font-semibold text-primary-glow hover:underline">
              {action.libelle} →
            </a>
          ) : (
            <Link
              to={action.vers}
              className="inline-block pt-1 text-sm font-semibold text-primary-glow hover:underline"
            >
              {action.libelle} →
            </Link>
          ))}
      </div>
    </article>
  )
}
