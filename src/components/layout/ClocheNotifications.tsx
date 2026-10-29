import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useMarquerNotifications,
  useNotifications,
  useNotificationsNonLues,
  useNotificationsTempsReel,
} from '@/hooks/useNotifications'
import { ilYA, lienNotification } from '@/lib/notifications'
import { cn } from '@/lib/utils'

// Cloche de l'en-tête (docs/KEYLI_DASHBOARD_DESIGN_SPEC.md) : pastille rouge
// des non lues, oscillation courte à la réception (temps réel), liste des
// dernières notifications ; un clic marque lue et ouvre la page concernée.
export function ClocheNotifications() {
  const naviguer = useNavigate()
  const liste = useNotifications()
  const nonLues = useNotificationsNonLues().data ?? 0
  const marquer = useMarquerNotifications()
  const [ouvert, setOuvert] = useState(false)
  const [oscille, setOscille] = useState(false)
  const conteneur = useRef<HTMLDivElement>(null)

  useNotificationsTempsReel(() => setOscille(true))

  // Fermeture au clic à l'extérieur ou sur Échap
  useEffect(() => {
    if (!ouvert) return
    const clic = (e: MouseEvent) => {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false)
    }
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false)
    document.addEventListener('mousedown', clic)
    document.addEventListener('keydown', touche)
    return () => {
      document.removeEventListener('mousedown', clic)
      document.removeEventListener('keydown', touche)
    }
  }, [ouvert])

  const ouvrir = (n: { id: string; type: string; property_id: string | null; lue: boolean | null }) => {
    if (!n.lue) marquer.mutate(n.id)
    setOuvert(false)
    naviguer(lienNotification(n.type, n.property_id))
  }

  return (
    <div ref={conteneur} className="relative">
      <Button
        variant="ghost"
        className="relative px-3"
        aria-label={nonLues > 0 ? `Notifications, ${nonLues} non lue${nonLues > 1 ? 's' : ''}` : 'Notifications'}
        aria-expanded={ouvert}
        aria-haspopup="true"
        onClick={() => setOuvert((o) => !o)}
      >
        <Bell
          className={cn('h-5 w-5', oscille && 'kf-cloche-oscille')}
          onAnimationEnd={() => setOscille(false)}
          aria-hidden
        />
        {nonLues > 0 && (
          <span
            key={nonLues}
            className="kf-pastille-apparait absolute right-1.5 top-1.5 min-w-[1.1rem] rounded-pill bg-destructive px-1 text-center text-[10px] font-bold leading-[1.1rem] text-destructive-foreground"
            aria-hidden
          >
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </Button>

      {ouvert && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="kf-panneau-ouvre absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-card shadow-lift"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {nonLues > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-primary-glow hover:underline"
                disabled={marquer.isPending}
                onClick={() => marquer.mutate(undefined)}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] divide-y overflow-y-auto">
            {liste.isPending && <li className="p-4 text-sm text-muted-foreground">Chargement…</li>}
            {liste.data?.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">Aucune notification pour l'instant.</li>
            )}
            {liste.data?.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => ouvrir(n)}
                  className={cn(
                    'flex w-full gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none',
                    !n.lue && 'bg-secondary/50',
                  )}
                >
                  <span
                    className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-pill', n.lue ? 'bg-transparent' : 'bg-primary')}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm', !n.lue && 'font-semibold')}>
                      {n.titre}
                      {!n.lue && <span className="sr-only"> (non lue)</span>}
                    </span>
                    {n.contenu && <span className="mt-0.5 block text-xs text-muted-foreground">{n.contenu}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground">{ilYA(n.created_at ?? '')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
