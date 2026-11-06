import React from 'react'
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Fond, Legende } from '../elements/Ambiance'
import { C, POLICE_TEXTE, formatFcfa, useFormat } from '../theme'
import { BarreRecherche } from './SceneCarte'
import type { ProprietesScene } from './SceneProbleme'

// Biens fictifs de démonstration
const BIENS = [
  { titre: 'Appartement 3 pièces', lieu: 'Riviera 3, Cocody', prix: 250000, teinte: ['#0046b8', '#00a898'] },
  { titre: 'Studio meublé', lieu: 'Deux-Plateaux, Cocody', prix: 180000, teinte: ['#1a1f2e', '#0046b8'] },
  { titre: 'Duplex 4 pièces', lieu: 'Angré, Cocody', prix: 295000, teinte: ['#00a898', '#1a1f2e'] },
]

// Photo stylisée : dégradé et silhouette de maison (pas de vraie photo)
const Vignette: React.FC<{ teinte: string[]; frame: number }> = ({ teinte, frame }) => (
  <div
    style={{
      position: 'relative',
      height: '58%',
      background: `linear-gradient(135deg, ${teinte[0]}, ${teinte[1]})`,
      overflow: 'hidden',
    }}
  >
    <svg viewBox="0 0 200 120" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <circle cx={160 - frame * 0.15} cy={28} r={14} fill="#fff" opacity={0.35} />
      <path d="M40 120 L40 70 L80 40 L120 70 L120 120 Z" fill="#fff" opacity={0.22} />
      <path d="M110 120 L110 80 L140 60 L170 80 L170 120 Z" fill="#fff" opacity={0.14} />
    </svg>
  </div>
)

export const SceneRecherche: React.FC<ProprietesScene> = ({ duree, legende }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { portrait, u } = useFormat()
  const camera = interpolate(frame, [0, duree], [1, 1.05])
  const liste = portrait ? BIENS.slice(0, 2) : BIENS
  return (
    <Fond clair>
      <AbsoluteFill style={{ scale: `${camera}` }}>
        <div
          style={{
            position: 'absolute',
            left: 70 * u,
            right: 70 * u,
            top: (portrait ? 420 : 230) * u,
            display: 'flex',
            flexDirection: portrait ? 'column' : 'row',
            gap: 36 * u,
            fontFamily: POLICE_TEXTE,
          }}
        >
          {liste.map((b, i) => {
            const s = spring({ frame: frame - 40 - i * 7, fps, config: { damping: 15, stiffness: 120 } })
            return (
              <div
                key={b.titre}
                style={{
                  flex: 1,
                  height: (portrait ? 560 : 520) * u,
                  borderRadius: 30 * u,
                  overflow: 'hidden',
                  background: C.blanc,
                  boxShadow: `0 ${26 * u}px ${60 * u}px -${22 * u}px rgba(26,31,46,0.35)`,
                  opacity: s,
                  translate: `0 ${(1 - s) * 120 * u}px`,
                  rotate: `${(1 - s) * (i - 1) * 4}deg`,
                }}
              >
                <Vignette teinte={b.teinte} frame={frame} />
                <div style={{ padding: `${24 * u}px ${28 * u}px` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 * u }}>
                    <div style={{ fontSize: 34 * u, fontWeight: 700, color: C.nuit }}>{b.titre}</div>
                    {i !== 1 && <Img src={staticFile('keyli_verified_badge.svg')} style={{ width: 40 * u }} />}
                  </div>
                  <div style={{ fontSize: 26 * u, color: C.gris, marginTop: 6 * u }}>{b.lieu}</div>
                  <div style={{ fontSize: 36 * u, fontWeight: 800, color: C.nuit, marginTop: 14 * u }}>
                    {formatFcfa(b.prix)} FCFA
                    <span style={{ fontSize: 24 * u, fontWeight: 500, color: C.gris }}> / mois</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>
      <BarreRecherche basculeA={duree - 24} />
      {legende && <Legende {...legende} clair />}
    </Fond>
  )
}
