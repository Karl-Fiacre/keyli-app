import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

// Étoiles en lecture seule (moyenne ou note d'un avis)
export function Etoiles({ note, className }: { note: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${note.toFixed(1)} sur 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('h-4 w-4', i <= Math.round(note) ? 'fill-gold text-gold' : 'text-muted-foreground/40')}
          aria-hidden
        />
      ))}
    </span>
  )
}

// Choix de la note : 1 à 5 étoiles (groupe de boutons radio accessible)
export function SaisieEtoiles({ valeur, onChange }: { valeur: number; onChange: (n: number) => void }) {
  const libelles = ['Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent']
  return (
    <div role="radiogroup" aria-label="Votre note" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={valeur === i}
          aria-label={`${i} étoile${i > 1 ? 's' : ''} — ${libelles[i - 1]}`}
          title={libelles[i - 1]}
          onClick={() => onChange(i)}
          className="rounded p-0.5 transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:scale-100"
        >
          <Star className={cn('h-7 w-7', i <= valeur ? 'fill-gold text-gold' : 'text-muted-foreground/50')} aria-hidden />
        </button>
      ))}
      {valeur > 0 && <span className="ml-2 text-sm text-muted-foreground">{libelles[valeur - 1]}</span>}
    </div>
  )
}
