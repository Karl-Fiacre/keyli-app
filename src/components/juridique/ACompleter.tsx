import type { ReactNode } from 'react'

// Information légale encore inconnue : bien visible, pour qu'elle ne parte
// jamais en ligne sans avoir été remplie (docs/MODULES/juridique.md).
export function ACompleter({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-pending/20 px-1.5 py-0.5 font-semibold text-pending-texte">
      À COMPLÉTER : {children}
    </mark>
  )
}
