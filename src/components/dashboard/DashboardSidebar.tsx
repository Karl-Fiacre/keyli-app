import { useLayoutEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface EntreeNav {
  vers: string
  libelle: string
  icone: LucideIcon // bibliothèque d'icônes du projet (spec §4)
  badge?: number // compteur (messages, leads, alertes…)
  fin?: boolean // correspondance exacte de l'URL (page d'accueil du dashboard)
}

export interface SectionNav {
  titre?: string // ex. « Compte »
  entrees: EntreeNav[]
}

// Navigation latérale des dashboards (KEYLI_DASHBOARD_DESIGN_SPEC.md §2-3) :
// fond bleu nuit pour l'Agence, blanc bordé pour Propriétaire et Chercheur
// (DESIGN_SYSTEM.md — choix visuel acté). L'indicateur de l'élément actif
// glisse verticalement vers le nouvel élément (spec 5.3). Sous 1024 px, la
// navigation devient une barre horizontale défilante.
export function DashboardSidebar({
  sections,
  variante = 'claire',
  affichage = 'colonne',
}: {
  sections: SectionNav[]
  variante?: 'claire' | 'sombre'
  affichage?: 'colonne' | 'barre' // colonne : grand écran ; barre : petit écran
}) {
  const sombre = variante === 'sombre'
  const { pathname } = useLocation()
  const liste = useRef<HTMLDivElement>(null)
  const barre = useRef<HTMLElement>(null)
  const [indicateur, setIndicateur] = useState<{ haut: number; hauteur: number } | null>(null)

  // Position de l'élément actif (mesurée après rendu, à chaque navigation)
  useLayoutEffect(() => {
    const actif = liste.current?.querySelector<HTMLElement>('a[aria-current="page"]')
    setIndicateur(actif ? { haut: actif.offsetTop, hauteur: actif.offsetHeight } : null)
    // Barre horizontale (petit écran) : l'élément actif reste visible
    barre.current
      ?.querySelector<HTMLElement>('a[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname])

  const lien = (e: EntreeNav, horizontal = false) => (
    <NavLink
      key={e.vers}
      to={e.vers}
      end={e.fin}
      className={({ isActive }) =>
        cn(
          'relative z-10 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
          horizontal && 'shrink-0 whitespace-nowrap',
          sombre
            ? isActive
              ? 'text-primary-foreground'
              : 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground'
            : isActive
              ? 'text-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          horizontal && isActive && (sombre ? 'bg-primary-foreground/15' : 'bg-secondary'),
        )
      }
    >
      <e.icone className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{e.libelle}</span>
      {!!e.badge && (
        <span
          className={cn(
            'kf-pastille-apparait rounded-pill px-2 py-0.5 text-[11px] font-semibold tabular-nums',
            sombre ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground',
          )}
        >
          {e.badge > 99 ? '99+' : e.badge}
          <span className="sr-only"> nouveaux</span>
        </span>
      )}
    </NavLink>
  )

  if (affichage === 'barre') {
    // Petit écran : barre horizontale défilante (sous la barre du haut)
    return (
      <nav
        ref={barre}
        aria-label="Navigation du tableau de bord"
        className={cn(
          'flex gap-1 overflow-x-auto px-4 py-2 lg:hidden',
          sombre ? 'bg-primary text-primary-foreground' : 'border-b bg-background',
        )}
      >
        {sections.flatMap((s) => s.entrees).map((e) => lien(e, true))}
      </nav>
    )
  }

  return (
    <>
      {/* Grand écran : colonne fixe */}
      <aside
        className={cn(
          'hidden w-64 shrink-0 flex-col gap-6 px-4 py-6 lg:flex',
          sombre ? 'bg-primary text-primary-foreground' : 'border-r bg-background',
        )}
      >
        <Link to="/" aria-label="Keyli — accueil" className="px-3">
          <img
            src={sombre ? '/keyli-logo-blanc-120.png' : '/keyli-logo-120.png'}
            srcSet={
              sombre
                ? '/keyli-logo-blanc-120.png 1x, /keyli-logo-blanc-240.png 2x'
                : '/keyli-logo-120.png 1x, /keyli-logo-240.png 2x'
            }
            alt="Keyli"
            className="h-12 w-auto"
          />
        </Link>
        <nav aria-label="Navigation du tableau de bord">
          <div ref={liste} className="relative space-y-6">
            {indicateur && (
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 top-0 rounded-lg transition-[transform,height] duration-[250ms] ease-out motion-reduce:transition-none',
                  sombre ? 'bg-primary-foreground/15' : 'bg-secondary',
                )}
                style={{ transform: `translateY(${indicateur.haut}px)`, height: indicateur.hauteur }}
              />
            )}
            {sections.map((s, i) => (
              <div key={s.titre ?? i} className="space-y-1">
                {s.titre && (
                  <p
                    className={cn(
                      'px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider',
                      sombre ? 'text-primary-foreground/50' : 'text-muted-foreground',
                    )}
                  >
                    {s.titre}
                  </p>
                )}
                {s.entrees.map((e) => lien(e))}
              </div>
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}
