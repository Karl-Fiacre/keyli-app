import React from 'react'
import { AbsoluteFill } from 'remotion'
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { SceneLogo } from './scenes/SceneLogo'
import { SceneRecherche } from './scenes/SceneRecherche'
import { SceneCarte } from './scenes/SceneCarte'
import { SceneVerification } from './scenes/SceneVerification'
import { SceneContact } from './scenes/SceneContact'

const T = 15
const minutage = linearTiming({ durationInFrames: T })
export const DUREES_ACCUEIL = [120, 240, 390, 240, 240, 180]
export const DUREE_ACCUEIL = DUREES_ACCUEIL.reduce((a, b) => a + b, 0) - (DUREES_ACCUEIL.length - 1) * T

// Vidéo de l'accueil (45 s, sans son : lecture automatique muette). Les
// atouts sont écrits à l'écran.
export const Accueil: React.FC = () => {
  const d = DUREES_ACCUEIL
  const scenes = [
    <SceneLogo duree={d[0]} sombre signature="Le logement de confiance à Abidjan" />,
    <SceneRecherche
      duree={d[1]}
      legende={{
        titre: 'Une recherche précise',
        texte: 'Commune, type de bien, budget : les annonces qui vous correspondent.',
      }}
    />,
    <SceneCarte
      duree={d[2]}
      legende={{
        titre: 'La carte et le GPS',
        texte: 'Chaque bien est situé par GPS. La carte montre une zone, jamais l’adresse exacte.',
      }}
    />,
    <SceneVerification
      duree={d[3]}
      legende={{ titre: 'Des annonces vérifiées', texte: 'Documents contrôlés et agences identifiées avant le badge.' }}
    />,
    <SceneContact
      duree={d[4]}
      legende={{
        titre: 'Contact, visite, avis',
        texte: 'Messagerie intégrée, visites planifiées, avis de vrais visiteurs.',
      }}
    />,
    <SceneLogo duree={d[5]} appel="Explorez les biens disponibles" />,
  ]
  // Types de transition différents dans un même tableau : props propres à chacune
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transitions: TransitionPresentation<any>[] = [fade(), slide({ direction: 'from-bottom' }), wipe({ direction: 'from-right' }), fade(), fade()]
  return (
    <AbsoluteFill style={{ background: '#10141f' }}>
      <TransitionSeries>
        {scenes.map((scene, i) => (
          <React.Fragment key={i}>
            {i > 0 && <TransitionSeries.Transition presentation={transitions[i - 1]} timing={minutage} />}
            <TransitionSeries.Sequence durationInFrames={d[i]} name={`Scène ${i + 1}`}>
              {scene}
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  )
}
