import type { ReactNode } from 'react'
import { useRevele } from '@/hooks/useRevele'

// Zone qui se révèle au défilement : quand elle entre dans l'écran, elle
// reçoit l'attribut data-visible ; ses éléments portant la classe kf-revele
// apparaissent alors (fondu + montée, décalage par --kf-delai).
// Exemple : <ZoneRevele><h2 className="kf-revele">…</h2></ZoneRevele>
export function ZoneRevele({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, visible } = useRevele<HTMLDivElement>()
  return (
    <div ref={ref} className={className} data-visible={visible || undefined}>
      {children}
    </div>
  )
}
