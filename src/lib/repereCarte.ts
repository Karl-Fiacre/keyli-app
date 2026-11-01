// Repère de carte aux couleurs Keyli (goutte bleu nuit, pastille blanche,
// maison turquoise). Les couleurs viennent des tokens de src/index.css :
// l'élément est inséré dans la page, les variables CSS s'y appliquent.
// Ce n'est ni le logo ni le badge « Vérifié » (docs/LOGO.md).

const SVG = 'http://www.w3.org/2000/svg'

function noeud<K extends keyof SVGElementTagNameMap>(nom: K, attributs: Record<string, string>) {
  const el = document.createElementNS(SVG, nom)
  for (const [cle, valeur] of Object.entries(attributs)) el.setAttribute(cle, valeur)
  return el
}

// Crée l'élément HTML du repère (contenu d'un AdvancedMarkerElement)
export function creerRepereKeyli(): HTMLElement {
  const conteneur = document.createElement('div')
  conteneur.className = 'repere-keyli'
  // La pointe de la goutte est le point exact : animation ancrée en bas
  conteneur.style.transformOrigin = '50% 100%'
  conteneur.style.filter = 'drop-shadow(0 4px 6px hsl(var(--primary) / 0.35))'
  conteneur.style.cursor = 'grab'

  const svg = noeud('svg', { width: '40', height: '52', viewBox: '0 0 40 52', 'aria-hidden': 'true' })
  // Goutte bleu nuit, liseré blanc pour rester lisible sur tous les fonds
  svg.appendChild(
    noeud('path', {
      d: 'M20 1C9.5 1 1 9.4 1 19.8 1 33.6 20 51 20 51s19-17.4 19-31.2C39 9.4 30.5 1 20 1z',
      fill: 'hsl(var(--primary))',
      stroke: 'hsl(var(--primary-foreground))',
      'stroke-width': '2',
    }),
  )
  // Pastille blanche
  svg.appendChild(noeud('circle', { cx: '20', cy: '19.5', r: '11', fill: 'hsl(var(--primary-foreground))' }))
  // Maison turquoise (toit + corps), rappel du logo
  svg.appendChild(
    noeud('path', {
      d: 'M14 19.2 20 14l6 5.2V26h-4v-4h-4v4h-4z',
      fill: 'hsl(var(--turquoise))',
      'stroke-linejoin': 'round',
    }),
  )
  conteneur.appendChild(svg)
  return conteneur
}

// Rejoue l'apparition du repère (classe de dashboard-animations.css,
// neutralisée si l'utilisateur réduit les animations)
export function animerRepere(el: HTMLElement) {
  el.classList.remove('kf-pastille-apparait')
  void el.offsetWidth
  el.classList.add('kf-pastille-apparait')
}
