import React from 'react'
import { AbsoluteFill, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion'
import { Audio } from '@remotion/media'
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import durees from './durees-voix.json'
import { SceneProbleme } from './scenes/SceneProbleme'
import { SceneVerification } from './scenes/SceneVerification'
import { SceneCarte } from './scenes/SceneCarte'
import { SceneContact } from './scenes/SceneContact'
import { SceneLogo } from './scenes/SceneLogo'

export type Voix = 'femme' | 'homme'
export const FPS = 30
const AVANT = 6 // images avant le début de la voix dans chaque scène
const APRES = 14 // respiration après la phrase
const TRANSITION = 12
const TENUE_FIN = 36 // le logo reste à l'écran après la dernière phrase
const IDS = ['s1', 's2', 's3', 's4', 's5'] as const

// Durée de chaque scène = phrase de voix off + respirations
export function dureesScenes(voix: Voix) {
  return IDS.map((id, i) => {
    const base = Math.ceil((durees[voix] as Record<string, number>)[id] * FPS) + AVANT + APRES
    return i === IDS.length - 1 ? base + TENUE_FIN : base
  })
}

export function dureePub(voix: Voix) {
  return dureesScenes(voix).reduce((a, b) => a + b, 0) - (IDS.length - 1) * TRANSITION
}

const minutage = linearTiming({ durationInFrames: TRANSITION })

// Publicité de 30 s (voix off femme ou homme). Mêmes images pour les deux
// voix ; le montage se cale sur la durée réelle de chaque phrase.
export const Pub: React.FC<{ voix: Voix }> = ({ voix }) => {
  const d = dureesScenes(voix)
  const { durationInFrames } = useVideoConfig()
  const scenes = [
    <SceneProbleme duree={d[0]} />,
    <SceneVerification duree={d[1]} />,
    <SceneCarte duree={d[2]} />,
    <SceneContact duree={d[3]} />,
    <SceneLogo duree={d[4]} appel="Rejoignez le pilote à Abidjan" />,
  ]
  // Types de transition différents dans un même tableau : props propres à chacune
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transitions: TransitionPresentation<any>[] = [fade(), wipe({ direction: 'from-left' }), slide({ direction: 'from-right' }), fade()]
  return (
    <AbsoluteFill style={{ background: '#10141f' }}>
      <TransitionSeries>
        {scenes.map((scene, i) => (
          <React.Fragment key={i}>
            {i > 0 && <TransitionSeries.Transition presentation={transitions[i - 1]} timing={minutage} />}
            <TransitionSeries.Sequence durationInFrames={d[i]} name={`Scène ${i + 1}`}>
              {scene}
              <Sequence from={AVANT} layout="none" name={`Voix ${i + 1}`}>
                <Audio src={staticFile(`voix/${voix}-${IDS[i]}.wav`)} />
              </Sequence>
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
      {/* Nappe musicale sous la voix, fondus d'entrée et de sortie */}
      <Audio
        src={staticFile('musique.wav')}
        volume={(f: number) =>
          interpolate(f, [0, 20, durationInFrames - 40, durationInFrames], [0, 0.16, 0.16, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
    </AbsoluteFill>
  )
}
