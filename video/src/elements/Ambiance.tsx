import React from 'react'
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, POLICE_TEXTE, prog, useFormat } from '../theme'

// Fond « cinéma » : dégradé profond, halo de lumière qui dérive lentement,
// vignette et grain de pellicule animé. Clair ou sombre selon la scène.
export const Fond: React.FC<{ clair?: boolean; children?: React.ReactNode }> = ({ clair, children }) => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const x = interpolate(frame, [0, 600], [30, 70])
  const y = interpolate(frame, [0, 600], [35, 55])
  return (
    <AbsoluteFill
      style={{
        background: clair
          ? `radial-gradient(circle at ${x}% ${y}%, #ffffff 0%, ${C.fond} 55%, #e3eaf5 100%)`
          : `radial-gradient(circle at ${x}% ${y}%, #23304a 0%, ${C.nuit} 45%, ${C.nuitProfond} 100%)`,
        overflow: 'hidden',
      }}
    >
      {children}
      <Vignette clair={clair} />
      <Grain w={width} h={height} />
    </AbsoluteFill>
  )
}

const Vignette: React.FC<{ clair?: boolean }> = ({ clair }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: clair
        ? 'radial-gradient(ellipse at center, transparent 60%, rgba(26,31,46,0.10) 100%)'
        : 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)',
    }}
  />
)

// Grain : bruit SVG dont la graine change à chaque image (effet pellicule)
const Grain: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const frame = useCurrentFrame()
  const graine = Math.floor(random(`grain-${Math.floor(frame / 2)}`) * 1000)
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.07, mixBlendMode: 'overlay' }}>
      <svg width={w} height={h}>
        <filter id={`grain-${graine}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={graine} />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${graine})`} />
      </svg>
    </AbsoluteFill>
  )
}

// Balayage de lumière diagonal (passage de « reflet » sur un titre ou un logo)
export const Reflet: React.FC<{ debut: number; duree?: number }> = ({ debut, duree = 30 }) => {
  const frame = useCurrentFrame()
  const p = prog(frame, debut, duree)
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: p > 0 && p < 1 ? 1 : 0,
        background: `linear-gradient(105deg, transparent ${p * 140 - 40}%, rgba(255,255,255,0.55) ${p * 140 - 25}%, transparent ${p * 140 - 10}%)`,
        mixBlendMode: 'overlay',
      }}
    />
  )
}

// Légende à l'écran (vidéo d'accueil, lue sans le son)
export const Legende: React.FC<{ titre: string; texte?: string; debut?: number; clair?: boolean }> = ({
  titre,
  texte,
  debut = 8,
  clair,
}) => {
  const frame = useCurrentFrame()
  const { portrait, u } = useFormat()
  const p = prog(frame, debut, 22)
  return (
    <div
      style={{
        position: 'absolute',
        left: portrait ? 80 * u : 110 * u,
        right: portrait ? 80 * u : undefined,
        bottom: portrait ? 170 * u : 90 * u,
        maxWidth: portrait ? undefined : 760 * u,
        opacity: p,
        translate: `0 ${(1 - p) * 30 * u}px`,
        fontFamily: POLICE_TEXTE,
        color: clair ? C.nuit : C.blanc,
        // Panneau translucide : la légende reste lisible sur tout décor
        padding: `${30 * u}px ${38 * u}px`,
        borderRadius: 28 * u,
        background: clair ? 'rgba(255,255,255,0.9)' : 'rgba(16,20,31,0.72)',
        boxShadow: `0 ${20 * u}px ${50 * u}px -${20 * u}px rgba(16,20,31,0.45)`,
      }}
    >
      <div
        style={{
          width: 64 * u,
          height: 6 * u,
          borderRadius: 3 * u,
          background: C.turquoise,
          marginBottom: 18 * u,
          scale: `${p} 1`,
          transformOrigin: 'left',
        }}
      />
      <div style={{ fontSize: 58 * u, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.5 * u }}>{titre}</div>
      {texte && (
        <div style={{ fontSize: 32 * u, marginTop: 14 * u, opacity: 0.8, lineHeight: 1.35 }}>{texte}</div>
      )}
    </div>
  )
}
