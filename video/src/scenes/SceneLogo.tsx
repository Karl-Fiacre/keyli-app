import React from 'react'
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Fond, Reflet } from '../elements/Ambiance'
import { C, POLICE_TEXTE, POLICE_TITRE, prog, useFormat } from '../theme'

// Révélation du logo officiel (fichier source, jamais redessiné) : le logo
// sort d'un léger flou en grossissant, un reflet le traverse, puis la
// signature et l'appel à l'action apparaissent.
export const SceneLogo: React.FC<{
  duree: number
  signature?: string
  appel?: string
  sombre?: boolean
}> = ({ duree, signature = 'Le logement de confiance, vérifié avant vous.', appel, sombre }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { portrait, u } = useFormat()
  const s = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 90 } })
  const flou = interpolate(s, [0, 1], [18, 0])
  const camera = interpolate(frame, [0, duree], [1, 1.06])
  return (
    <Fond clair={!sombre}>
      <AbsoluteFill
        style={{
          scale: `${camera}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: POLICE_TEXTE,
          textAlign: 'center',
          padding: `0 ${80 * u}px`,
        }}
      >
        <div style={{ position: 'relative' }}>
          <Img
            src={staticFile(sombre ? 'keyli-logo-blanc-960.png' : 'keyli-logo-960.png')}
            style={{
              width: (portrait ? 620 : 560) * u,
              opacity: s,
              scale: `${interpolate(s, [0, 1], [0.7, 1])}`,
              filter: `blur(${flou}px)`,
            }}
          />
          <Reflet debut={22} duree={28} />
        </div>
        <div
          style={{
            fontFamily: POLICE_TITRE,
            fontSize: (portrait ? 64 : 60) * u,
            fontWeight: 700,
            color: sombre ? C.blanc : C.nuit,
            marginTop: 10 * u,
            maxWidth: 1300 * u,
            lineHeight: 1.15,
            opacity: prog(frame, 26, 22),
            translate: `0 ${(1 - prog(frame, 26, 22)) * 30 * u}px`,
          }}
        >
          {signature}
        </div>
        {appel && (
          <div
            style={{
              marginTop: 44 * u,
              padding: `${22 * u}px ${48 * u}px`,
              borderRadius: 999,
              background: C.turquoise,
              color: C.blanc,
              fontSize: 36 * u,
              fontWeight: 700,
              opacity: prog(frame, 44, 18),
              scale: `${0.9 + 0.1 * prog(frame, 44, 18)}`,
            }}
          >
            {appel}
          </div>
        )}
      </AbsoluteFill>
    </Fond>
  )
}
