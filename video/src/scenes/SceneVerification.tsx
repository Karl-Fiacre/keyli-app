import React from 'react'
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Fond, Legende, Reflet } from '../elements/Ambiance'
import { C, POLICE_TEXTE, POLICE_TITRE, prog, useFormat } from '../theme'
import type { ProprietesScene } from './SceneProbleme'

const CONTROLES = [
  { titre: 'Pièce d’identité', detail: 'Propriétaire identifié' },
  { titre: 'Documents du bien', detail: 'ACD, attestation…' },
  { titre: 'Registre de commerce', detail: 'Pour chaque agence' },
]

// Vérification : les contrôles se cochent un à un, puis le badge
// « Vérifié » tombe comme un tampon (anneau qui s'élargit).
export const SceneVerification: React.FC<ProprietesScene> = ({ duree, legende }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { portrait, u } = useFormat()
  const tampon = 20 + CONTROLES.length * 16 + 6
  const s = spring({ frame: frame - tampon, fps, config: { damping: 9, stiffness: 160 } })
  const onde = prog(frame, tampon + 4, 26)
  const camera = interpolate(frame, [0, duree], [1.04, 1])

  return (
    <Fond clair>
      <AbsoluteFill
        style={{
          scale: `${camera}`,
          display: 'flex',
          flexDirection: portrait ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: (portrait ? 70 : 140) * u,
          fontFamily: POLICE_TEXTE,
          paddingBottom: legende ? 300 * u : 0,
          paddingLeft: legende && !portrait ? 260 * u : 0,
        }}
      >
        {/* Fiche de contrôle */}
        <div
          style={{
            width: 640 * u,
            background: C.blanc,
            borderRadius: 28 * u,
            padding: 44 * u,
            boxShadow: `0 ${30 * u}px ${70 * u}px -${20 * u}px rgba(26,31,46,0.3)`,
            opacity: prog(frame, 0, 18),
            translate: `0 ${(1 - prog(frame, 0, 18)) * 60 * u}px`,
            rotate: `${(1 - prog(frame, 0, 24)) * -3}deg`,
          }}
        >
          <div style={{ fontSize: 26 * u, fontWeight: 700, color: C.turquoise, letterSpacing: 2 * u }}>
            CONTRÔLE KEYLI
          </div>
          <div style={{ fontFamily: POLICE_TITRE, fontSize: 52 * u, fontWeight: 700, color: C.nuit, marginTop: 8 * u }}>
            Avant publication
          </div>
          <div style={{ marginTop: 30 * u, display: 'flex', flexDirection: 'column', gap: 22 * u }}>
            {CONTROLES.map((c, i) => {
              const coche = spring({ frame: frame - 20 - i * 16, fps, config: { damping: 12 } })
              return (
                <div key={c.titre} style={{ display: 'flex', alignItems: 'center', gap: 22 * u }}>
                  <div
                    style={{
                      width: 54 * u,
                      height: 54 * u,
                      borderRadius: 27 * u,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: interpolate(coche, [0, 1], [0, 1]) > 0.5 ? C.vert : '#eef2f7',
                      color: C.blanc,
                      fontSize: 32 * u,
                      fontWeight: 800,
                      scale: `${0.8 + 0.2 * coche}`,
                    }}
                  >
                    <span style={{ opacity: coche }}>✓</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 36 * u, fontWeight: 700, color: C.nuit }}>{c.titre}</div>
                    <div style={{ fontSize: 26 * u, color: C.gris }}>{c.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Badge Vérifié (asset officiel, distinct du logo) */}
        <div style={{ position: 'relative', width: 380 * u, height: 380 * u }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `${6 * u}px solid ${C.or}`,
              scale: `${1 + onde * 0.9}`,
              opacity: (1 - onde) * (frame > tampon ? 1 : 0),
            }}
          />
          <Img
            src={staticFile('keyli_verified_badge.svg')}
            style={{
              width: '100%',
              height: '100%',
              scale: `${interpolate(s, [0, 1], [2.4, 1])}`,
              opacity: Math.min(1, s * 2),
              rotate: `${interpolate(s, [0, 1], [-25, 0])}deg`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: -100 * u,
              right: -100 * u,
              marginTop: 24 * u,
              textAlign: 'center',
              fontFamily: POLICE_TITRE,
              fontSize: 54 * u,
              fontWeight: 700,
              color: C.nuit,
              opacity: prog(frame, tampon + 10, 18),
            }}
          >
            Vérifié
          </div>
        </div>
      </AbsoluteFill>
      <Reflet debut={tampon + 6} duree={26} />
      {legende && <Legende {...legende} clair />}
    </Fond>
  )
}
