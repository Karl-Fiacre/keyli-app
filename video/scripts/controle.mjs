// Rendu d'images fixes de contrôle (une seule préparation du projet)
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
import path from 'node:path'

const [, , id, ...images] = process.argv
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') })
const composition = await selectComposition({ serveUrl, id })
for (const f of images) {
  await renderStill({ composition, serveUrl, output: `out/controle/${id}-${f}.jpg`, frame: Number(f), scale: 0.5, imageFormat: 'jpeg' })
  console.log('image', f)
}
