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

// Transition partagée carte → fiche (API View Transitions du navigateur,
// via `viewTransition` de React Router) : la photo de la carte porte le
// même nom que la grande photo de la fiche, le navigateur l'agrandit de
// l'une à l'autre. Navigateur sans cette API : navigation normale.
export const nomTransitionPhoto = (id: string) => `photo-annonce-${id}`

// État de navigation posé par la carte : aperçu de la photo (déjà en cache)
// pour que la fiche ait une destination même pendant son chargement, et
// signal pour que TransitionPage ne joue pas son propre effet par-dessus.
export interface EtatTransitionPartagee {
  transitionPartagee: true
  apercu?: string | null
}

export const estTransitionPartagee = (etat: unknown): etat is EtatTransitionPartagee =>
  typeof etat === 'object' && etat !== null && (etat as { transitionPartagee?: unknown }).transitionPartagee === true

// Retour de la fiche vers la liste : la carte de cette annonce reprend le
// nom de transition pour que la photo revienne à sa place
export interface EtatRetourAnnonce {
  retourAnnonce: string
}

export const estRetourAnnonce = (etat: unknown): etat is EtatRetourAnnonce =>
  typeof etat === 'object' && etat !== null && typeof (etat as { retourAnnonce?: unknown }).retourAnnonce === 'string'

// Ressort des réactions au geste et des indicateurs qui glissent (onglet
// actif, bascule) : vif, sans rebond visible (lots 2 et 3, 2026-11-26)
export const RESSORT = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 } as const

// Panneaux qui s'ouvrent sous un bouton (notifications, partage, menus) :
// entrée en ~0,25 s, sortie plus brève — fermer doit paraître immédiat
export const variantePanneau: Variants = {
  cache: { opacity: 0, y: -6, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: EASE_CINEMA } },
  sortie: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.14, ease: 'easeIn' } },
}

// Bandeaux posés en bas de l'écran (consentement, messages)
export const varianteBandeau: Variants = {
  cache: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: DUREE.rapide, ease: EASE_CINEMA } },
  sortie: { opacity: 0, y: 16, transition: { duration: 0.18, ease: 'easeIn' } },
}

// Volet qui se déplie en hauteur (menu mobile, sections repliables)
export const varianteVolet: Variants = {
  cache: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: DUREE.rapide, ease: EASE_CINEMA } },
  sortie: { opacity: 0, height: 0, transition: { duration: 0.2, ease: EASE_CINEMA } },
}
