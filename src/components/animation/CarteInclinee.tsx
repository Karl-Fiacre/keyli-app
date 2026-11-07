import { useState, type PointerEvent, type ReactNode } from 'react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'

// Carte qui s'incline en 3D sous la souris, avec un reflet de lumière qui
// suit le pointeur (registre cinématique, docs/ANIMATIONS.md). Seulement
// avec une souris (pas au doigt) et jamais en mouvements réduits.
export function CarteInclinee({
  children,
  className,
  intensite = 8,
  arrondi = 'rounded-accueil',
}: {
  children: ReactNode
  className?: string
  // Inclinaison maximale en degrés
  intensite?: number
  // Arrondi de la carte, repris par le reflet
  arrondi?: string
}) {
  const reduit = useReducedMotion()
  const [souris] = useState(() => {
    try {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches
    } catch {
      return false
    }
  })
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const ressort = { stiffness: 160, damping: 18, mass: 0.6 }
  const rotateX = useSpring(useTransform(py, [0, 1], [intensite, -intensite]), ressort)
  const rotateY = useSpring(useTransform(px, [0, 1], [-intensite, intensite]), ressort)
  const lumiereX = useTransform(px, (v) => `${v * 100}%`)
  const lumiereY = useTransform(py, (v) => `${v * 100}%`)
  const reflet = useMotionTemplate`radial-gradient(420px circle at ${lumiereX} ${lumiereY}, rgb(255 255 255 / 0.14), transparent 60%)`

  if (reduit || !souris) return <div className={className}>{children}</div>

  const suivre = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const relacher = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <div style={{ perspective: 1100 }} className={className}>
      <motion.div
        onPointerMove={suivre}
        onPointerLeave={relacher}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className={`relative h-full ${arrondi}`}
      >
        {children}
        <motion.div
          aria-hidden
          className={`pointer-events-none absolute inset-0 ${arrondi}`}
          style={{ background: reflet }}
        />
      </motion.div>
    </div>
  )
}
