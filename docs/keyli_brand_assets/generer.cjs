// Usage : depuis un dossier de travail, installer les outils puis lancer
//   npm install @resvg/resvg-js opentype.js @fontsource/caladea png-to-ico
//   node docs/keyli_brand_assets/generer.cjs
// (outils volontairement hors des dépendances du projet web)
//
// Génération des assets de marque Keyli à partir d'UNE géométrie unique,
// relevée sur l'icône source docs/design-reference/icons/app_icon_source.png
// (repère 1024 × 1024). Aucune réinterprétation : mêmes formes, mêmes
// proportions, mêmes couleurs (DESIGN_SYSTEM.md : navy #1a1f2e, or #b8862f).
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');
const { Resvg } = require('@resvg/resvg-js');

const NAVY = '#1a1f2e';
const OR = '#b8862f';
const BLANC = '#ffffff';
// Racine du dépôt (ce script vit dans docs/keyli_brand_assets/)
const DEPOT = path.resolve(__dirname, '../..');
const MARQUE = path.join(DEPOT, 'docs/keyli_brand_assets');
const ASSETS = path.join(DEPOT, 'docs/assets');
const PUBLIC = path.join(DEPOT, 'public');
for (const d of [MARQUE, ASSETS, PUBLIC]) fs.mkdirSync(d, { recursive: true });

// --- Géométrie de la clé (repère de l'icône source) -------------------------
// Panneton = maison (toit au sommet x = 512, centre exact de 397..627)
const cle = (couleurCle, couleurSerrure) => `
    <path d="M512 127 L627 340 L627 585 L397 585 L397 340 Z" fill="${couleurCle}"/>
    <rect x="462" y="585" width="99" height="148" fill="${couleurCle}"/>
    <rect x="561" y="733" width="82" height="65" fill="${couleurCle}"/>
    <rect x="561" y="823" width="62" height="65" fill="${couleurCle}"/>
    <circle cx="512" cy="455" r="75" fill="${couleurSerrure}"/>
    <rect x="477" y="510" width="70" height="33" fill="${couleurSerrure}"/>`;
// Panneton seul (favicon : la clé entière est illisible à 16 px)
const panneton = (couleurCle, couleurSerrure) => `
    <path d="M512 127 L627 340 L627 585 L397 585 L397 340 Z" fill="${couleurCle}"/>
    <circle cx="512" cy="455" r="75" fill="${couleurSerrure}"/>
    <rect x="477" y="510" width="70" height="33" fill="${couleurSerrure}"/>`;
// Boîte englobante de la clé : x 397..643, y 127..888
const CLE = { x: 397, y: 127, l: 246, h: 761 };

const svg = (vb, contenu, titre) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${titre}">\n  <title>${titre}</title>${contenu}\n</svg>\n`;

// --- Mot « KEYLI » en tracés (Caladea Bold, libre, métriquement équivalente
// à Cambria — la police des titres de la charte) ------------------------------
const police = opentype.parse(fs.readFileSync(
  require.resolve('@fontsource/caladea/files/caladea-latin-700-normal.woff')).buffer);
function motEnTraces(texte, taille, x, ligneDeBase, couleur, espacement) {
  let curseur = x, d = '';
  for (const c of texte) {
    const g = police.charToGlyph(c);
    d += g.getPath(curseur, ligneDeBase, taille).toPathData(2);
    curseur += (g.advanceWidth / police.unitsPerEm) * taille + espacement;
  }
  return { d: `<path d="${d}" fill="${couleur}"/>`, largeur: curseur - x - espacement };
}

// --- Logotype complet : clé + KEYLI ------------------------------------------
function logotype(couleurCle, couleurSerrure, couleurTexte) {
  const hauteurCle = 120, s = hauteurCle / CLE.h;
  const taille = 64, espacement = 6;
  const hauteurCapitales = (police.tables.os2.sCapHeight / police.unitsPerEm) * taille;
  const xTexte = CLE.l * s + 22;
  // Capitales centrées verticalement sur le panneton (127..585 dans le repère)
  const centrePanneton = ((127 + 585) / 2 - CLE.y) * s;
  const ligneDeBase = centrePanneton + hauteurCapitales / 2;
  const mot = motEnTraces('KEYLI', taille, xTexte, ligneDeBase, couleurTexte, espacement);
  const largeur = Math.ceil(xTexte + mot.largeur + 2);
  const contenu = `
  <g transform="scale(${s.toFixed(5)}) translate(${-CLE.x} ${-CLE.y})">${cle(couleurCle, couleurSerrure)}
  </g>
  ${mot.d}`;
  return svg(`0 0 ${largeur} ${hauteurCle}`, contenu, 'Keyli');
}

const ecrire = (fichier, texte) => { fs.writeFileSync(fichier, texte); console.log('écrit', path.relative(DEPOT, fichier)); };
const png = (svgTexte, largeur) => new Resvg(svgTexte, { fitTo: { mode: 'width', value: largeur } }).render().asPng();

// Marque seule (sans texte)
const vbCle = `${CLE.x - 20} ${CLE.y - 20} ${CLE.l + 40} ${CLE.h + 40}`;
ecrire(path.join(MARQUE, 'keyli-mark.svg'), svg(vbCle, cle(NAVY, OR), 'Keyli'));
ecrire(path.join(MARQUE, 'keyli-mark-blanc.svg'), svg(vbCle, cle(BLANC, OR), 'Keyli'));

// Logotype complet (LOGO.md : assets/keyli-logo-full.svg) — fond clair et fond sombre
const logoClair = logotype(NAVY, OR, NAVY);
const logoSombre = logotype(BLANC, OR, BLANC);
ecrire(path.join(ASSETS, 'keyli-logo-full.svg'), logoClair);
ecrire(path.join(ASSETS, 'keyli-logo-full-blanc.svg'), logoSombre);

// Icône d'application : identique à la source (fond navy plein)
const icone = svg('0 0 1024 1024', `\n  <rect width="1024" height="1024" fill="${NAVY}"/>${cle(BLANC, OR)}`, 'Keyli');
ecrire(path.join(MARQUE, 'keyli_app_icon.svg'), icone);
fs.writeFileSync(path.join(MARQUE, 'keyli_app_icon_1024.png'), png(icone, 1024));
console.log('écrit docs/keyli_brand_assets/keyli_app_icon_1024.png');

// Android adaptive icon : calque transparent 432, clé dans la zone sûre (66 %)
const sA = 264 / CLE.h;
const adaptatif = svg('0 0 432 432',
  `\n  <g transform="translate(${216 - (CLE.l * sA) / 2} ${216 - 132}) scale(${sA.toFixed(5)}) translate(${-CLE.x} ${-CLE.y})">${cle(BLANC, OR)}\n  </g>`,
  'Keyli');
fs.writeFileSync(path.join(MARQUE, 'keyli_app_icon_adaptive_foreground_432.png'), png(adaptatif, 432));
console.log('écrit docs/keyli_brand_assets/keyli_app_icon_adaptive_foreground_432.png');

// Favicon : panneton seul, comme favicon_source.png
const faviconSvg = svg('377 107 270 498', panneton(NAVY, OR), 'Keyli');
ecrire(path.join(MARQUE, 'favicon.svg'), faviconSvg);
ecrire(path.join(PUBLIC, 'favicon.svg'), faviconSvg);
const carre = svg('262 107 500 500', panneton(NAVY, OR), 'Keyli');
(async () => {
  const tailles = [16, 32, 48].map((t) => png(carre, t));
  const pngToIco = (await import('png-to-ico')).default;
  const ico = await pngToIco(tailles);
  fs.writeFileSync(path.join(MARQUE, 'favicon.ico'), ico);
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), ico);
  console.log('écrit favicon.ico (16/32/48) dans docs/keyli_brand_assets et public');
  // Copies servies par l'application web
  fs.copyFileSync(path.join(ASSETS, 'keyli-logo-full.svg'), path.join(PUBLIC, 'keyli-logo-full.svg'));
  fs.copyFileSync(path.join(ASSETS, 'keyli-logo-full-blanc.svg'), path.join(PUBLIC, 'keyli-logo-full-blanc.svg'));
  fs.copyFileSync(path.join(DEPOT, 'docs/assets/keyli_verified_badge.svg'), path.join(PUBLIC, 'keyli_verified_badge.svg'));
  // Aperçus PNG pour relecture
  fs.writeFileSync(path.join(MARQUE, 'apercu-logo-full.png'), png(logoClair, 800));
  console.log('terminé');
})();
