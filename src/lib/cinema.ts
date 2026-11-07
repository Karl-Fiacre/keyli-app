import type { Transition, Variants } from 'motion/react'

// Registre « cinématique » (décision du porteur du 2026-11-07,
// docs/ANIMATIONS.md) : rythmes et courbes communs à toutes les animations
// Motion du site. Une seule source pour garder un mouvement cohérent.

// Courbe « cinéma » : départ franc, arrivée très douce
export const EASE_CINEMA = [0.22, 1, 0.36, 1] as const
// Courbe d'entrée/sortie symétrique (rideau, balayages)
export const EASE_RIDEAU = [0.76, 0, 0.24, 1] as const

export const DUREE = {
  rapide: 0.35,
  base: 0.6,
  lente: 0.9,
  scene: 1.2,
} as const

export const transitionCinema = (delai = 0, duree: number = DUREE.lente): Transition => ({
  duration: duree,
  ease: EASE_CINEMA,
  delay: delai,
})

// Apparition « mise au point » : l'élément monte, sort du flou et grandit
// légèrement, comme une caméra qui fait le point
export const varianteMiseAuPoint: Variants = {
  cache: { opacity: 0, y: 36, scale: 0.97, filter: 'blur(10px)' },
  visible: (delai: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: transitionCinema(delai),
  }),
}

// Révélation par masque : l'élément se dévoile de bas en haut
export const varianteMasque: Variants = {
  cache: { clipPath: 'inset(100% 0% 0% 0%)', opacity: 0.4 },
  visible: (delai: number = 0) => ({
    clipPath: 'inset(0% 0% 0% 0%)',
    opacity: 1,
    transition: { duration: DUREE.scene, ease: EASE_RIDEAU, delay: delai },
  }),
}

// Entrée en profondeur : l'élément arrive de l'arrière-plan (zoom arrière)
export const varianteProfondeur: Variants = {
  cache: { opacity: 0, scale: 1.12, filter: 'blur(14px)' },
  visible: (delai: number = 0) => ({
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: transitionCinema(delai, DUREE.scene),
  }),
}

// Cascade : décalage du i-ème élément d'une liste, plafonné pour qu'une
// longue liste n'attende pas
export const delaiCinema = (i: number, pas = 0.08, max = 0.6) => Math.min(i * pas, max)
