// Badge officiel de vérification (docs/LOGO.md) — asset distinct du logo,
// affiché UNIQUEMENT sur un bien ou un profil réellement vérifié. Même
// dessin que public/keyli_verified_badge.svg (cercle or, disque navy, coche
// or), repris tel quel : toute évolution de la marque passe par generer.cjs
// et doit être reportée ici.
import Svg, { Circle, Polyline } from 'react-native-svg'
import { couleurs } from '@mobile/theme/tokens'

export function BadgeVerifie({ taille = 20, libelle = 'Vérifié par Keyli' }: { taille?: number; libelle?: string }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 680 680" accessibilityLabel={libelle} accessibilityRole="image">
      <Circle cx={340} cy={340} r={292} fill="none" stroke={couleurs.or} strokeWidth={10} />
      <Circle cx={340} cy={340} r={238} fill={couleurs.navyLogo} />
      <Polyline
        points="252,340 312,395 456,258"
        fill="none"
        stroke={couleurs.or}
        strokeWidth={30}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
