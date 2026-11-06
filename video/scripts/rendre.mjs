// Rendu des vidéos Keyli (une seule préparation du projet pour tout).
// Usage : node scripts/rendre.mjs [Id ...]   (sans argument : tout)
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'node:path'

const RENDUS = {
  PubFemme: { sortie: 'keyli-pub-voix-femme-16x9.mp4', crf: 20 },
  PubHomme: { sortie: 'keyli-pub-voix-homme-16x9.mp4', crf: 20 },
  PubFemmeVertical: { sortie: 'keyli-pub-voix-femme-9x16.mp4', crf: 20 },
  PubHommeVertical: { sortie: 'keyli-pub-voix-homme-9x16.mp4', crf: 20 },
  // Vidéo du site : 720p, sans piste son, compressée pour les connexions mobiles
  Accueil: { sortie: 'keyli-accueil.mp4', crf: 28, echelle: 2 / 3, muet: true },
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(RENDUS)
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') })
for (const id of ids) {
  const r = RENDUS[id]
  const composition = await selectComposition({ serveUrl, id })
  const debut = Date.now()
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: r.crf,
    scale: r.echelle ?? 1,
    muted: r.muet ?? false,
    concurrency: 2, // machine à 8 Go de mémoire
    imageFormat: 'jpeg',
    jpegQuality: 92,
    pixelFormat: 'yuv420p',
    outputLocation: path.join('out', r.sortie),
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 25 === 0) process.stdout.write(`\r${id} ${Math.round(progress * 100)} %`)
    },
  })
  console.log(`\n${id} → out/${r.sortie} (${Math.round((Date.now() - debut) / 1000)} s)`)
}
