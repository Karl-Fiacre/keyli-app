// Motif décoratif de la bannière : rangées de toits stylisés en traits fins
// turquoise, très discrets. Ce n'est PAS le logo (docs/LOGO.md) — simple
// texture qui évoque la ville. Couleur tirée des tokens, aucune valeur hex.
export function MotifToits({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden focusable="false" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="kf-motif-toits" width="64" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M4 30 L18 18 L32 30 M36 42 L50 30 L64 42 M-28 42 L-14 30 L0 42"
            fill="none"
            stroke="hsl(var(--turquoise))"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kf-motif-toits)" />
    </svg>
  )
}
