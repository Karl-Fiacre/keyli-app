import type { ReactNode } from 'react'
import { motion, type Variants } from 'motion/react'
import { varianteMasque, varianteMiseAuPoint, varianteProfondeur } from '@/lib/cinema'

const VARIANTES: Record<'mise-au-point' | 'masque' | 'profondeur', Variants> = {
  'mise-au-point': varianteMiseAuPoint,
  masque: varianteMasque,
  profondeur: varianteProfondeur,
}

// Élément qui se révèle une seule fois quand il entre dans l'écran
// (registre cinématique, docs/ANIMATIONS.md). Mouvements réduits : Motion
// supprime les déplacements (MotionConfig reducedMotion="user").
export function Revele({
  children,
  effet = 'mise-au-point',
  delai = 0,
  className,
  as = 'div',
}: {
  children: ReactNode
  effet?: keyof typeof VARIANTES
  delai?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const Composant = motion[as]
  return (
    <Composant
      className={className}
      variants={VARIANTES[effet]}
      initial="cache"
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      custom={delai}
    >
      {children}
    </Composant>
  )
}
