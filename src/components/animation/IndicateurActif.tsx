import { motion } from 'motion/react'
import { RESSORT } from '@/lib/cinema'
import { cn } from '@/lib/utils'

// Fond de l'option active d'un groupe (onglets, bascule Liste | Carte) qui
// glisse d'une option à l'autre au lieu de sauter (lot 2). À poser dans le
// bouton actif, lui-même en `relative` ; `groupe` doit être unique sur la
// page (useId). Le libellé du bouton passe au-dessus avec `relative z-10`.
export function IndicateurActif({ groupe, className }: { groupe: string; className?: string }) {
  return (
    <motion.span
      layoutId={`indicateur-${groupe}`}
      transition={RESSORT}
      aria-hidden
      className={cn('absolute inset-0 rounded-md bg-primary', className)}
    />
  )
}
