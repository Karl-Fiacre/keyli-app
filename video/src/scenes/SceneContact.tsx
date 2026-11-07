import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Fond, Legende } from '../elements/Ambiance'
import { C, POLICE_TEXTE, POLICE_TITRE, prog, useFormat } from '../theme'
import type { ProprietesScene } from './SceneProbleme'

const MESSAGES = [
  { moi: true, texte: 'Bonjour, l’appartement est-il disponible ?' },
  { moi: false, texte: 'Oui ! Visite possible samedi.' },
  { moi: true, texte: 'Parfait, samedi 10 h.' },
]

// Contact, visite et avis : la messagerie, la visite confirmée, puis les
// étoiles (seuls les vrais visiteurs notent un bien).
export const SceneContact: React.FC<ProprietesScene> = ({ duree, legende }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { portrait, u } = useFormat()
  const r = duree / 140 // les temps ci-dessous sont prévus pour ~140 images
  const t = (n: number) => Math.round(n * r)
  const camera = interpolate(frame, [0, duree], [1.06, 1])
  const visite = spring({ frame: frame - t(62), fps, config: { damping: 14 } })

  return (
    <Fond>
      <AbsoluteFill
        style={{
          scale: `${camera}`,
          display: 'flex',
          // Avec une légende (en bas à gauche), le téléphone passe à droite
          flexDirection: portrait ? 'column' : legende ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: (portrait ? 60 : 130) * u,
          fontFamily: POLICE_TEXTE,
          paddingBottom: legende ? 140 * u : 0,
        }}
      >
        {/* Téléphone */}
        <div
          style={{
            width: 470 * u,
            height: (portrait ? 760 : 820) * u,
            borderRadius: 64 * u,
            background: '#0b0e16',
            padding: 16 * u,
            boxShadow: `0 ${40 * u}px ${90 * u}px -${20 * u}px rgba(0,0,0,0.7), 0 0 0 ${3 * u}px #2c3550`,
            opacity: prog(frame, 0, 16),
            translate: `0 ${(1 - prog(frame, 0, 22)) * 80 * u}px`,
            rotate: `${(1 - prog(frame, 0, 30)) * 6}deg`,
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 50 * u,
              background: C.fond,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: `${44 * u}px ${28 * u}px ${18 * u}px`, background: C.blanc, borderBottom: `1px solid ${C.bord}` }}>
              <div style={{ fontSize: 26 * u, fontWeight: 700, color: C.nuit }}>Awa · Propriétaire vérifiée</div>
              <div style={{ fontSize: 20 * u, color: C.gris }}>Appartement 3 pièces, Riviera 3</div>
            </div>
            <div style={{ flex: 1, padding: 22 * u, display: 'flex', flexDirection: 'column', gap: 14 * u }}>
              {MESSAGES.map((m, i) => {
                const s = spring({ frame: frame - t(10 + i * 16), fps, config: { damping: 14 } })
                return (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.moi ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      padding: `${14 * u}px ${18 * u}px`,
                      borderRadius: 22 * u,
                      background: m.moi ? C.bleu : C.blanc,
                      color: m.moi ? C.blanc : C.nuit,
                      fontSize: 24 * u,
                      lineHeight: 1.3,
                      opacity: s,
                      scale: `${0.85 + 0.15 * s}`,
                      transformOrigin: m.moi ? 'right bottom' : 'left bottom',
                    }}
                  >
                    {m.texte}
                  </div>
                )
              })}
              <div
                style={{
                  marginTop: 10 * u,
                  padding: 18 * u,
                  borderRadius: 22 * u,
                  background: C.blanc,
                  borderLeft: `${8 * u}px solid ${C.vert}`,
                  opacity: visite,
                  translate: `0 ${(1 - visite) * 40 * u}px`,
                }}
              >
                <div style={{ fontSize: 20 * u, fontWeight: 700, color: C.vert, letterSpacing: 1.5 * u }}>
                  VISITE CONFIRMÉE
                </div>
                <div style={{ fontSize: 26 * u, fontWeight: 700, color: C.nuit, marginTop: 4 * u }}>Samedi · 10 h 00</div>
              </div>
            </div>
          </div>
        </div>

        {/* Avis après visite */}
        <div style={{ color: C.blanc, maxWidth: (portrait ? 900 : 640) * u, textAlign: portrait ? 'center' : 'left' }}>
          <div
            style={{
              fontFamily: POLICE_TITRE,
              fontSize: 64 * u,
              fontWeight: 700,
              lineHeight: 1.1,
              opacity: prog(frame, t(80), 18),
              translate: `0 ${(1 - prog(frame, t(80), 18)) * 30 * u}px`,
            }}
          >
            Un avis après chaque vraie visite
          </div>
          <div style={{ display: 'flex', gap: 14 * u, marginTop: 30 * u, justifyContent: portrait ? 'center' : 'flex-start' }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const s = spring({ frame: frame - t(92) - i * 4, fps, config: { damping: 8, stiffness: 180 } })
              return (
                <svg key={i} viewBox="0 0 24 24" width={72 * u} height={72 * u} style={{ scale: `${s}`, rotate: `${(1 - s) * -90}deg` }}>
                  <path
                    d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"
                    fill={i < 4 || frame > t(92) + 30 ? C.or : '#3a4560'}
                  />
                </svg>
              )
            })}
          </div>
        </div>
      </AbsoluteFill>
      {legende && <Legende {...legende} />}
    </Fond>
  )
}
