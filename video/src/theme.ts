import { Easing, interpolate, useVideoConfig } from 'remotion'

// Charte Keyli (docs/DESIGN_SYSTEM.md, docs/LOGO.md) — mêmes valeurs que
// src/index.css du site. Aucune couleur inventée.
export const C = {
  nuit: '#1a1f2e', // --primary
  nuitProfond: '#10141f',
  bleu: '#0046b8', // --primary-glow, bleu du logo
  turquoise: '#00a898', // --turquoise
  or: '#b8862f', // --gold, étoiles et badge
  vert: '#21c45d', // --success
  rouge: '#e5484d', // --destructive
  fond: '#f4f7fb', // --secondary
  blanc: '#ffffff',
  gris: '#5c6a80', // --muted-foreground
  bord: '#e2e8f0',
}

export const POLICE_TITRE = 'Cambria, Caladea, Georgia, serif'
export const POLICE_TEXTE = '"Segoe UI", Roboto, -apple-system, sans-serif'

// Courbe « cinéma » : départ vif, arrivée très douce
export const DOUX = Easing.bezier(0.16, 1, 0.3, 1)

// Progression 0 → 1 entre deux images, bornée et adoucie
export function prog(frame: number, debut: number, duree: number, easing = DOUX) {
  return interpolate(frame, [debut, debut + duree], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  })
}

// Format portrait (9:16) ou paysage (16:9) : les scènes s'adaptent
export function useFormat() {
  const { width, height } = useVideoConfig()
  const portrait = height > width
  // Unité proportionnelle : 1 u = 1 px sur un côté court de 1080
  const u = Math.min(width, height) / 1080
  return { portrait, u, width, height }
}

export const formatFcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/ | /g, ' ')
