import React from 'react'
import { Composition, Folder } from 'remotion'
import { Pub, dureePub, FPS } from './Pub'
import { Accueil, DUREE_ACCUEIL } from './Accueil'

// Trois vidéos Keyli : deux publicités (voix femme, voix homme), en 16:9
// et en 9:16 (WhatsApp, TikTok, Reels), et la vidéo de l'accueil du site.
export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Publicites">
      <Composition
        id="PubFemme"
        component={Pub}
        defaultProps={{ voix: 'femme' as const }}
        durationInFrames={dureePub('femme')}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="PubHomme"
        component={Pub}
        defaultProps={{ voix: 'homme' as const }}
        durationInFrames={dureePub('homme')}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="PubFemmeVertical"
        component={Pub}
        defaultProps={{ voix: 'femme' as const }}
        durationInFrames={dureePub('femme')}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="PubHommeVertical"
        component={Pub}
        defaultProps={{ voix: 'homme' as const }}
        durationInFrames={dureePub('homme')}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </Folder>
    <Composition id="Accueil" component={Accueil} durationInFrames={DUREE_ACCUEIL} fps={30} width={1920} height={1080} />
  </>
)
