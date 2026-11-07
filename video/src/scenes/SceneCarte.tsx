import React from 'react'
import { AbsoluteFill, interpolate, random, useCurrentFrame } from 'remotion'
import { Legende } from '../elements/Ambiance'
import { CarteAbidjan, projeter, REPERES } from '../elements/CarteAbidjan'
import { C, DOUX, POLICE_TEXTE, prog, useFormat } from '../theme'
import type { ProprietesScene } from './SceneProbleme'

const FOCUS = 'riviera'

// Carte : barre de recherche, repères de prix qui tombent, puis la caméra
// plonge sur un bien : réticule, coordonnées GPS qui défilent et zone
// approximative (l'adresse exacte n'est jamais montrée).
export const SceneCarte: React.FC<ProprietesScene & { avecRecherche?: boolean }> = ({
  duree,
  legende,
  avecRecherche = true,
}) => {
  const frame = useCurrentFrame()
  const { portrait, u, width: W, height: H } = useFormat()

  // Position écran du repère mis en avant (carte en « slice » plein cadre)
  const k = Math.max(W / 1000, H / 700)
  const decX = (W - 1000 * k) / 2
  const decY = (H - 700 * k) / 2
  const cible = REPERES.find((r) => r.id === FOCUS)!
  const p = projeter(cible.lon, cible.lat)
  const px = decX + p.x * k
  // Caméra centrée sur la pointe du repère (la zone GPS l'entoure)
  const py = decY + p.y * k

  // Plongée de caméra
  const debutZoom = Math.round(duree * 0.38)
  const z = prog(frame, debutZoom, Math.round(duree * 0.3), DOUX)
  const echelle = interpolate(z, [0, 1], [1.02, portrait ? 1.4 : 1.65])
  const tx = (W / 2 - px) * z
  const ty = (H / 2 - py) * z
  const derive = interpolate(frame, [0, duree], [0, -12 * u])

  // Révélation des coordonnées après la plongée
  const finZoom = debutZoom + Math.round(duree * 0.3)
  const gps = prog(frame, finZoom - 8, 20)
  const defile = 1 - prog(frame, finZoom, 26)
  const chiffre = (vrai: number, sel: string) =>
    (vrai + (random(`${sel}-${Math.floor(frame / 2)}`) - 0.5) * 0.02 * defile).toFixed(4).replace('.', ',')

  return (
    <AbsoluteFill style={{ background: C.fond, overflow: 'hidden', fontFamily: POLICE_TEXTE }}>
      <AbsoluteFill
        style={{
          transformOrigin: `${px}px ${py}px`,
          transform: `translate(${tx}px, ${ty + derive}px) scale(${echelle})`,
        }}
      >
        <CarteAbidjan apparition={avecRecherche ? 22 : 8} focus={FOCUS} debutFocus={debutZoom} />
      </AbsoluteFill>

      {/* Zone approximative + réticule */}
      <div
        style={{
          position: 'absolute',
          left: W / 2,
          top: H / 2,
          width: 420 * u,
          height: 420 * u,
          marginLeft: -210 * u,
          marginTop: -210 * u,
          borderRadius: '50%',
          background: 'rgba(0,168,152,0.16)',
          border: `${4 * u}px dashed ${C.turquoise}`,
          opacity: gps,
          scale: `${0.6 + 0.4 * gps + Math.sin(frame / 8) * 0.015}`,
        }}
      />
      {[0, 1].map((axe) => (
        <div
          key={axe}
          style={{
            position: 'absolute',
            left: axe ? W / 2 - 1 * u : 0,
            top: axe ? 0 : H / 2,
            width: axe ? 2 * u : W,
            height: axe ? H : 2 * u,
            background: C.bleu,
            opacity: 0.35 * gps,
            scale: axe ? `1 ${gps}` : `${gps} 1`,
          }}
        />
      ))}

      {/* Carte des coordonnées GPS */}
      <div
        style={{
          position: 'absolute',
          left: portrait ? 70 * u : undefined,
          right: 70 * u,
          top: portrait ? undefined : 90 * u,
          bottom: portrait ? 330 * u : undefined,
          padding: `${28 * u}px ${36 * u}px`,
          borderRadius: 26 * u,
          background: 'rgba(26,31,46,0.92)',
          color: C.blanc,
          opacity: gps,
          translate: `0 ${(1 - gps) * 30 * u}px`,
          boxShadow: `0 ${24 * u}px ${60 * u}px -${20 * u}px rgba(0,0,0,0.5)`,
        }}
      >
        <div style={{ fontSize: 24 * u, letterSpacing: 2 * u, color: C.turquoise, fontWeight: 700 }}>
          POSITION GPS
        </div>
        <div style={{ fontSize: 50 * u, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 6 * u }}>
          {chiffre(5.356, 'lat')}° N · {chiffre(3.968, 'lon')}° O
        </div>
        <div style={{ fontSize: 26 * u, opacity: 0.75, marginTop: 8 * u }}>
          Cocody, Riviera · zone approximative (~450 m)
        </div>
      </div>

      {/* Barre de recherche et bascule Liste | Carte */}
      {avecRecherche && <BarreRecherche />}
      {legende && <Legende {...legende} clair />}
    </AbsoluteFill>
  )
}

export const BarreRecherche: React.FC<{ debut?: number; basculeA?: number }> = ({ debut = 0, basculeA }) => {
  const frame = useCurrentFrame()
  const { portrait, u } = useFormat()
  const texte = 'Cocody · Appartement · 300 000 FCFA max'
  const nb = Math.round(interpolate(frame, [debut + 6, debut + 30], [0, texte.length], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }))
  const entree = prog(frame, debut, 16)
  const carte = prog(frame, basculeA ?? debut + 34, 10)
  return (
    <div
      style={{
        position: 'absolute',
        left: 70 * u,
        right: portrait ? 70 * u : undefined,
        top: (portrait ? 150 : 70) * u,
        display: 'flex',
        flexDirection: portrait ? 'column' : 'row',
        alignItems: portrait ? 'stretch' : 'center',
        gap: 18 * u,
        fontFamily: POLICE_TEXTE,
        opacity: entree,
        translate: `0 ${(1 - entree) * -40 * u}px`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18 * u,
          minWidth: portrait ? undefined : 820 * u,
          padding: `${22 * u}px ${30 * u}px`,
          borderRadius: 999,
          background: C.blanc,
          boxShadow: `0 ${18 * u}px ${44 * u}px -${14 * u}px rgba(26,31,46,0.35)`,
          fontSize: 34 * u,
          color: C.nuit,
          fontWeight: 600,
        }}
      >
        <span style={{ color: C.bleu, fontSize: 36 * u }}>⌕</span>
        <span>
          {texte.slice(0, nb)}
          <span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0, color: C.bleu }}>|</span>
        </span>
      </div>
      <div
        style={{
          alignSelf: portrait ? 'flex-start' : undefined,
          display: 'flex',
          padding: 6 * u,
          borderRadius: 999,
          background: C.blanc,
          boxShadow: `0 ${18 * u}px ${44 * u}px -${14 * u}px rgba(26,31,46,0.35)`,
          fontSize: 28 * u,
          fontWeight: 700,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 6 * u,
            bottom: 6 * u,
            left: 6 * u + carte * 130 * u,
            width: 130 * u,
            borderRadius: 999,
            background: C.nuit,
          }}
        />
        {['Liste', 'Carte'].map((l, i) => (
          <div
            key={l}
            style={{
              position: 'relative',
              width: 130 * u,
              textAlign: 'center',
              padding: `${12 * u}px 0`,
              color: (i === 1 ? carte > 0.5 : carte <= 0.5) ? C.blanc : C.nuit,
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}
