// Charte visuelle mobile : mêmes tokens que le web (src/index.css,
// docs/DESIGN_SYSTEM.md et docs/LOGO.md), convertis en couleurs
// hexadécimales. Les écrans n'utilisent QUE ces valeurs, jamais une couleur
// inventée sur place.
import { Platform } from 'react-native'

export const couleurs = {
  fond: '#ffffff',
  texte: '#101b2d', // --foreground (218 47 % 12 %)
  primaire: '#101b2d', // --primary (218 47 % 12 %), navy dominant
  navyLogo: '#1a1f2e', // fond de l'icône et de l'écran de démarrage
  surPrimaire: '#ffffff',
  bleuLogo: '#0046b8', // --primary-glow : liens, accents secondaires
  turquoise: '#00a898', // --turquoise : accent public
  secondaire: '#f1f5f9', // --secondary : fond de carte, zone secondaire
  attenue: '#5c6a80', // --muted-foreground
  bordure: '#e2e8f0', // --border
  succes: '#21c45d', // pastilles « vérifié »
  succesTexte: '#107535',
  attente: '#f97316', // en attente — jamais rouge
  attenteTexte: '#ae4609',
  erreur: '#ef4444',
  erreurTexte: '#ba1c1c',
  or: '#b8862f', // étoiles des avis uniquement
  // Fonds des messages : la couleur à 10 % sur blanc (bg-…/10 du web)
  erreurFond: '#fdecec',
  succesFond: '#e9f9ef',
} as const

export const rayons = { carte: 12, champ: 12, pilule: 999 } as const

export const espaces = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const

// Texte courant : police système (comme le web). Titres : serif (Cambria sur
// le web), jamais dans les formulaires.
export const polices = {
  titre: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
} as const

export const ombreCarte = {
  shadowColor: '#101b2d',
  shadowOpacity: 0.1,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const
