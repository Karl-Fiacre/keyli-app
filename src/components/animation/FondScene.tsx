import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { MotifToits } from '@/components/accueil/MotifToits'
import { EASE_CINEMA } from '@/lib/cinema'

// Décor animé des bannières bleu nuit (accueil, À propos, Pilote) — registre
// cinématique, docs/ANIMATIONS.md : motif de toits qui apparaît en zoom
// arrière, halos lumineux qui dérivent lentement, balayage de lumière à
// l'ouverture ; au défilement, motif et halos glissent à des vitesses
// différentes (profondeur). À poser dans une section « relative isolate
// overflow-hidden ». Mouvements réduits : décor fixe.
export function FondScene() {
  const zone = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: zone, offset: ['start start', 'end start'] })
  const motifY = useTransform(scrollYProgress, [0, 1], ['0%', '35%'])
  const haloY = useTransform(scrollYProgress, [0, 1], ['0%', '60%'])

  return (
    <div ref={zone} aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <motion.div className="absolute inset-0" style={{ y: motifY }}>
        <motion.div
          className="h-full w-full"
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 0.12, scale: 1 }}
          transition={{ duration: 2.4, ease: EASE_CINEMA }}
        >
          <MotifToits className="h-full w-full" />
        </motion.div>
      </motion.div>
      {/* Halos (dégradés flous, pas d'image) */}
      <motion.div className="absolute inset-0" style={{ y: haloY }}>
        <motion.div
          className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-turquoise/25 blur-3xl"
          animate={{ x: [0, -60, 20, 0], y: [0, 40, -20, 0], scale: [1, 1.12, 0.95, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-primary-glow/40 blur-3xl"
          animate={{ x: [0, 70, -10, 0], y: [0, -50, 10, 0], scale: [1, 0.9, 1.1, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
      {/* Balayage de lumière à l'ouverture */}
      <motion.div
        className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: '0%' }}
        animate={{ x: '400%' }}
        transition={{ duration: 2.2, delay: 0.4, ease: EASE_CINEMA }}
      />
    </div>
  )
}
