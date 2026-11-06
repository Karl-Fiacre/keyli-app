import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, POLICE_TEXTE, prog } from '../theme'

// Carte schématique d'Abidjan (lagune Ébrié, littoral, communes). Repère
// 1000 × 700 : longitude -4,15 → -3,85 (x), latitude 5,45 → 5,20 (y).
// Dessin volontairement simplifié : c'est une illustration, pas un plan.
export const projeter = (lon: number, lat: number) => ({
  x: ((lon + 4.15) / 0.3) * 1000,
  y: ((5.45 - lat) / 0.25) * 700,
})

const COMMUNES: Array<[string, number, number]> = [
  ['Abobo', -4.02, 5.425],
  ['Adjamé', -4.025, 5.365],
  ['Yopougon', -4.085, 5.345],
  ['Attécoubé', -4.05, 5.335],
  ['Plateau', -4.018, 5.322],
  ['Cocody', -3.975, 5.36],
  ['Bingerville', -3.89, 5.36],
  ['Treichville', -4.005, 5.294],
  ['Marcory', -3.98, 5.299],
  ['Koumassi', -3.945, 5.296],
  ['Port-Bouët', -3.93, 5.255],
]

export type Repere = { id: string; lon: number; lat: number; prix: string; verifie?: boolean }

// Biens fictifs de démonstration (prix mensuels en FCFA)
export const REPERES: Repere[] = [
  { id: 'riviera', lon: -3.968, lat: 5.356, prix: '250 k', verifie: true },
  { id: 'angre', lon: -3.985, lat: 5.392, prix: '180 k', verifie: true },
  { id: 'plateau', lon: -4.017, lat: 5.327, prix: '450 k' },
  { id: 'marcory', lon: -3.983, lat: 5.303, prix: '150 k', verifie: true },
  { id: 'yopougon', lon: -4.075, lat: 5.348, prix: '90 k' },
  { id: 'koumassi', lon: -3.948, lat: 5.299, prix: '120 k' },
  { id: 'deuxplateaux', lon: -3.998, lat: 5.37, prix: '320 k', verifie: true },
  { id: 'abobo', lon: -4.02, lat: 5.418, prix: '75 k' },
]

// Lagune Ébrié : bande est-ouest avec la baie du Banco et la baie de Cocody
const LAGUNE =
  'M -600 380 L -20 372 C 80 360 160 392 250 384 C 300 380 318 350 335 318 C 352 345 360 372 395 380 ' +
  'C 420 386 438 384 452 374 C 470 382 492 380 512 366 C 525 345 538 322 556 318 C 566 340 572 368 598 376 ' +
  'C 640 386 690 368 760 372 C 840 378 920 366 1020 372 L 1600 380 L 1600 440 L 1020 448 C 930 452 840 440 760 446 ' +
  'C 700 450 640 432 600 440 C 560 448 520 436 488 446 C 460 454 440 452 418 446 C 360 432 300 452 240 446 ' +
  'C 160 440 80 452 -20 446 L -600 440 Z'
const OCEAN = 'M -600 604 C 200 588 420 596 640 586 C 820 578 920 584 1600 580 L 1600 1100 L -600 1100 Z'
const ROUTES = [
  'M 430 80 C 430 160 420 230 418 300',
  'M 120 300 C 220 320 330 330 418 330 C 500 332 560 330 640 300 C 720 270 820 260 900 252',
  'M 470 470 C 520 500 600 510 700 520 C 780 528 860 540 940 560',
  'M 300 250 C 350 270 390 290 418 300',
]

export const CarteAbidjan: React.FC<{
  apparition?: number // image de début d'apparition des repères
  focus?: string // repère mis en avant
  debutFocus?: number
}> = ({ apparition = 10, focus, debutFocus = 60 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tracé = prog(frame, 0, 40)

  return (
    <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="terre" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7f9fc" />
          <stop offset="100%" stopColor="#eaf0f7" />
        </linearGradient>
        <linearGradient id="eau" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfe8e3" />
          <stop offset="100%" stopColor="#9fd8d1" />
        </linearGradient>
        <pattern id="quadrillage" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#dbe3ee" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="-600" y="-400" width="2200" height="1500" fill="url(#terre)" />
      <rect x="-600" y="-400" width="2200" height="1500" fill="url(#quadrillage)" opacity={0.6} />
      <path d={OCEAN} fill="url(#eau)" />
      <path d={LAGUNE} fill="url(#eau)" />
      {/* Canal de Vridi */}
      <path d="M 452 446 L 470 590" stroke="#a9ddd6" strokeWidth="10" />
      {ROUTES.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#ffffff"
          strokeWidth={7}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - tracé}
        />
      ))}
      {COMMUNES.map(([nom, lon, lat]) => {
        const { x, y } = projeter(lon, lat)
        return (
          <text
            key={nom}
            x={x}
            y={y + 34}
            textAnchor="middle"
            fontFamily={POLICE_TEXTE}
            fontSize={17}
            fontWeight={600}
            letterSpacing={1.5}
            fill={C.gris}
            opacity={0.75 * tracé}
          >
            {nom.toUpperCase()}
          </text>
        )
      })}
      {REPERES.map((r, i) => {
        const { x, y } = projeter(r.lon, r.lat)
        const s = spring({ frame: frame - apparition - i * 4, fps, config: { damping: 12, stiffness: 140 } })
        const actif = r.id === focus && frame >= debutFocus
        const enAvant = actif ? prog(frame, debutFocus, 18) : 0
        const autres = focus && frame >= debutFocus ? 1 - 0.55 * prog(frame, debutFocus, 18) : 1
        return (
          <g key={r.id} transform={`translate(${x} ${y})`} opacity={r.id === focus ? 1 : autres}>
            <g transform={`translate(0 ${interpolate(s, [0, 1], [-40, 0])}) scale(${s * (1 + 0.25 * enAvant)})`}>
              <rect
                x={-46}
                y={-54}
                width={92}
                height={40}
                rx={20}
                fill={actif ? C.bleu : C.nuit}
                stroke="#fff"
                strokeWidth={3}
              />
              <path d="M -9 -15 L 0 -2 L 9 -15 Z" fill={actif ? C.bleu : C.nuit} />
              <text
                y={-27}
                textAnchor="middle"
                fontFamily={POLICE_TEXTE}
                fontSize={19}
                fontWeight={700}
                fill="#fff"
              >
                {r.prix}
              </text>
              {r.verifie && <circle cx={42} cy={-52} r={10} fill={C.or} stroke="#fff" strokeWidth={2.5} />}
            </g>
          </g>
        )
      })}
    </svg>
  )
}
