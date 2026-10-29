// Keyli — déclinaisons de taille du logo et de l'icône officiels (2026-11-02)
//
// Sources (fournies par le porteur, fond transparent) :
//   sources/keyli-logo-source.png   logotype complet « Keyli » (K + toit + anneau)
//   sources/keyli-icone-source.png  icône seule (K + toit + anneau), favicon
// Règle docs/LOGO.md : rien n'est redessiné. Ce script ne fait que recadrer
// (marges transparentes retirées), redimensionner, poser sur un fond plein
// quand la plateforme l'exige (iOS, PWA) et, pour la variante « fond
// sombre », passer le bleu du logotype en blanc (le turquoise ne change pas).
//
// Usage : installer les outils dans un dossier de travail hors du projet,
// puis pointer NODE_PATH vers son node_modules :
//   npm install sharp@0.33 png-to-ico@2
//   NODE_PATH=<dossier>/node_modules node docs/keyli_brand_assets/generer-raster.cjs
// Sorties : docs/keyli_brand_assets/raster/ et copies servies dans public/.
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const ICI = __dirname
const SOURCES = path.join(ICI, 'sources')
const SORTIE = path.join(ICI, 'raster')
const PUBLIC = path.join(ICI, '..', '..', 'public')
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }
const BLANC = { r: 255, g: 255, b: 255, alpha: 1 }

fs.mkdirSync(SORTIE, { recursive: true })

// Recadre au plus près du dessin (marges transparentes retirées)
async function recadrer(fichier) {
  return sharp(path.join(SOURCES, fichier)).trim({ threshold: 1 }).png().toBuffer()
}

// Variante fond sombre : pixels bleus (logotype) → blanc, alpha conservé
async function versionBlanche(tampon) {
  const { data, info } = await sharp(tampon).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    // Bleu dominant, contours antialiasés compris ; le turquoise (vert > bleu) est épargné
    const bleu = b > g && b > r + 25
    if (bleu) data[i] = data[i + 1] = data[i + 2] = 255
  }
  return sharp(data, { raw: info }).png().toBuffer()
}

// Logotype : largeur donnée, marge de 4 % de chaque côté
async function logotype(tampon, largeur, nom) {
  const marge = Math.round(largeur * 0.04)
  const fichier = path.join(SORTIE, nom)
  await sharp(tampon)
    .resize({ width: largeur - 2 * marge })
    .extend({ top: marge, bottom: marge, left: marge, right: marge, background: TRANSPARENT })
    .png({ compressionLevel: 9 })
    .toFile(fichier)
  return fichier
}

// Icône carrée : dessin centré occupant `part` du côté, sur fond donné
async function icone(tampon, cote, nom, { part = 0.84, fond = TRANSPARENT } = {}) {
  const interieur = Math.round(cote * part)
  const dessin = await sharp(tampon)
    .resize({ width: interieur, height: interieur, fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer()
  const fichier = path.join(SORTIE, nom)
  await sharp({ create: { width: cote, height: cote, channels: 4, background: fond } })
    .composite([{ input: dessin, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(fichier)
  return fichier
}

function copierDansPublic(fichier, nom = path.basename(fichier)) {
  fs.copyFileSync(fichier, path.join(PUBLIC, nom))
}

;(async () => {
  const logo = await recadrer('keyli-logo-source.png')
  const logoBlanc = await versionBlanche(logo)
  const ic = await recadrer('keyli-icone-source.png')

  // Logotype complet, fond clair et fond sombre : 1x / 2x / 4x d'une
  // largeur d'affichage de 120 px (en-tête), plus une grande version
  for (const l of [120, 240, 480, 960]) {
    const clair = await logotype(logo, l, `keyli-logo-${l}.png`)
    const sombre = await logotype(logoBlanc, l, `keyli-logo-blanc-${l}.png`)
    if (l <= 480) {
      copierDansPublic(clair)
      copierDansPublic(sombre)
    }
  }

  // Icône seule, transparente
  for (const c of [64, 128, 256, 512]) await icone(ic, c, `keyli-icone-${c}.png`)

  // Favicons (le dessin occupe presque tout le carré pour rester lisible à 16 px)
  const favicons = []
  for (const c of [16, 32, 48]) favicons.push(await icone(ic, c, `favicon-${c}.png`, { part: 0.96 }))
  copierDansPublic(favicons[0])
  copierDansPublic(favicons[1])
  const mod = require('png-to-ico')
  const pngToIco = mod.default ?? mod
  const ico = await pngToIco(favicons)
  fs.writeFileSync(path.join(SORTIE, 'favicon.ico'), ico)
  copierDansPublic(path.join(SORTIE, 'favicon.ico'))

  // iOS (pas de transparence) : fond blanc
  copierDansPublic(await icone(ic, 180, 'apple-touch-icon.png', { part: 0.76, fond: BLANC }))
  await icone(ic, 1024, 'keyli_app_icon_1024.png', { part: 0.76, fond: BLANC })

  // PWA / Android : icônes 192 et 512 sur fond blanc ; « maskable » avec le
  // dessin dans la zone sûre (cercle de 80 %) ; calque adaptatif transparent
  // (dessin dans les 66 % centraux, fond blanc à déclarer dans le XML)
  copierDansPublic(await icone(ic, 192, 'icon-192.png', { part: 0.8, fond: BLANC }))
  copierDansPublic(await icone(ic, 512, 'icon-512.png', { part: 0.8, fond: BLANC }))
  copierDansPublic(await icone(ic, 512, 'icon-maskable-512.png', { part: 0.6, fond: BLANC }))
  await icone(ic, 432, 'keyli_app_icon_adaptive_foreground_432.png', { part: 0.62 })

  console.log('Déclinaisons générées dans', SORTIE)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
