import type { ReactNode } from 'react'
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react'
import { varianteBandeau, variantePanneau, varianteVolet } from '@/lib/cinema'

const VARIANTES = { panneau: variantePanneau, bandeau: varianteBandeau, volet: varianteVolet }

// Élément qui apparaît ET disparaît en douceur (lot 2, docs/ANIMATIONS.md) :
// remplace les `{ouvert && <div className="kf-panneau-ouvre">}` qui
// s'ouvraient en fondu mais se fermaient d'un coup. Les propriétés restantes
// (role, aria-*, className, style…) vont sur l'élément affiché.
// Mouvements réduits : MotionConfig reducedMotion="user" (App.tsx) coupe les
// déplacements, il ne reste qu'un fondu.
export function Apparition({
  visible,
  variante = 'panneau',
  children,
  ...props
}: {
  visible: boolean
  variante?: keyof typeof VARIANTES
  children: ReactNode
} & Omit<HTMLMotionProps<'div'>, 'children' | 'initial' | 'animate' | 'exit' | 'variants'>) {
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          {...props}
          variants={VARIANTES[variante]}
          initial="cache"
          animate="visible"
          exit="sortie"
          style={{ overflow: variante === 'volet' ? 'hidden' : undefined, ...props.style }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
