import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { Fond, Legende } from '../elements/Ambiance'
import { C, POLICE_TEXTE, POLICE_TITRE, prog, useFormat } from '../theme'

export type ProprietesScene = { duree: number; legende?: { titre: string; texte?: string } }

// Silhouette de ville (immeubles et toits) — décor, pas un lieu précis
const Ville: React.FC<{ largeur: number; hauteur: number }> = ({ largeur, hauteur }) => {
  const frame = useCurrentFrame()
  const blocs = [
    [0, 260], [70, 340], [130, 220], [190, 420], [250, 300], [320, 520], [380, 360], [440, 280],
    [500, 460], [560, 380], [630, 300], [690, 560], [750, 340], [820, 260], [880, 420], [940, 300],
  ]
  return (
    <svg viewBox="0 0 1000 600" preserveAspectRatio="none" width={largeur} height={hauteur}>
      {blocs.map(([x, h], i) => {
        const monte = prog(frame, i * 1.5, 30)
        return (
          <g key={i}>
            <rect x={x} y={600 - h * monte} width={56} height={h} fill="#202a40" />
            {/* Fenêtres allumées */}
            {Array.from({ length: Math.floor(h / 60) }).map((_, j) => (
              <rect
                key={j}
                x={x + 12 + (j % 2) * 20}
                y={600 - h * monte + 24 + j * 52}
                width={10}
                height={16}
                fill={C.or}
                opacity={((i * 7 + j * 3) % 5 === 0 ? 0.9 : 0.25) * monte}
              />
            ))}
          </g>
        )
      })}
      {/* Ligne turquoise d'horizon */}
      <rect x={0} y={596} width={1000 * prog(frame, 10, 40)} height={4} fill={C.turquoise} />
    </svg>
  )
}

const PIEGES = ['Fausses annonces', 'Frais de visite perdus', 'Biens qui n’existent pas']

export const SceneProbleme: React.FC<ProprietesScene> = ({ duree, legende }) => {
  const frame = useCurrentFrame()
  const { portrait, u, width, height } = useFormat()
  // Lent travelling avant sur toute la scène
  const zoom = interpolate(frame, [0, duree], [1, 1.12])
  return (
    <Fond>
      <AbsoluteFill style={{ scale: `${zoom}`, transformOrigin: '50% 80%' }}>
        <AbsoluteFill style={{ top: 'auto', height: height * (portrait ? 0.38 : 0.42), opacity: 0.85 }}>
          <Ville largeur={width} hauteur={height * (portrait ? 0.38 : 0.42)} />
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          padding: portrait ? `${420 * u}px ${80 * u}px` : `${150 * u}px ${130 * u}px`,
          fontFamily: POLICE_TEXTE,
          color: C.blanc,
        }}
      >
        <div
          style={{
            fontFamily: POLICE_TITRE,
            fontSize: (portrait ? 92 : 96) * u,
            fontWeight: 700,
            lineHeight: 1.05,
            maxWidth: portrait ? undefined : 1100 * u,
            opacity: prog(frame, 4, 24),
            translate: `0 ${(1 - prog(frame, 4, 24)) * 40 * u}px`,
          }}
        >
          Chercher un logement à Abidjan ?
        </div>
        <div style={{ marginTop: 50 * u, display: 'flex', flexDirection: 'column', gap: 22 * u }}>
          {PIEGES.map((p, i) => {
            const debut = 30 + i * 18
            const barre = prog(frame, debut + 14, 16)
            return (
              <div
                key={p}
                style={{
                  position: 'relative',
                  alignSelf: 'flex-start',
                  fontSize: 52 * u,
                  fontWeight: 600,
                  color: '#ffd2d4',
                  opacity: prog(frame, debut, 14) * (1 - 0.2 * barre),
                  translate: `${(1 - prog(frame, debut, 14)) * -40 * u}px 0`,
                }}
              >
                ✕ {p}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '54%',
                    height: 5 * u,
                    width: `${barre * 100}%`,
                    background: C.rouge,
                    borderRadius: 3 * u,
                  }}
                />
              </div>
            )
          })}
        </div>
      </AbsoluteFill>
      {legende && <Legende {...legende} />}
    </Fond>
  )
}
