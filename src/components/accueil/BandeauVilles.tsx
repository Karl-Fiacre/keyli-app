import { MapPin } from 'lucide-react'
import { VILLES_PILOTE } from '@/partage/lib/villes'

// Bandeau des villes ouvertes, qui défile en continu (page À propos,
// demande du porteur du 2026-11-15). La liste est doublée pour boucler sans
// à-coup ; la copie est cachée aux lecteurs d'écran. Pause au survol ;
// mouvements réduits : liste immobile qui passe à la ligne
// (dashboard-animations.css).
function Liste({ double = false }: { double?: boolean }) {
  return (
    <ul
      className={double ? 'kf-defilement-double flex shrink-0 items-center' : 'flex shrink-0 items-center'}
      aria-hidden={double || undefined}
    >
      {/* Deux tours par liste : plus large que les grands écrans, pas de vide */}
      {[...VILLES_PILOTE, ...VILLES_PILOTE].map((ville, i) => (
        <li
          key={`${ville}-${i}`}
          aria-hidden={i >= VILLES_PILOTE.length || undefined}
          className={`${i >= VILLES_PILOTE.length ? 'kf-defilement-double ' : ''}flex items-center gap-2 px-6 font-titre text-lg font-bold md:text-xl`}
        >
          <MapPin className="h-4 w-4 text-turquoise" aria-hidden />
          {ville}
          <span className="ml-6 h-1.5 w-1.5 rounded-full bg-primary-foreground/30" aria-hidden />
        </li>
      ))}
    </ul>
  )
}

export function BandeauVilles() {
  return (
    <section
      className="overflow-hidden border-y border-primary-foreground/10 bg-primary py-4 text-primary-foreground"
      aria-label="Villes ouvertes pendant le pilote"
    >
      <div className="kf-defilement-continu flex w-max">
        <Liste />
        <Liste double />
      </div>
    </section>
  )
}
