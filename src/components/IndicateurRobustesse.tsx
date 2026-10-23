import { cn } from '@/lib/utils'
import { robustesseMotDePasse } from '@/lib/validation'

// Indicateur de robustesse affiché en temps réel à l'inscription (PRD,
// docs/MODULES/auth.md). Rouge = erreur/faible, orange = moyen, vert = bon.
const NIVEAUX = [
  { libelle: '', couleur: 'bg-border' },
  { libelle: 'Faible', couleur: 'bg-destructive' },
  { libelle: 'Moyen', couleur: 'bg-pending' },
  { libelle: 'Bon', couleur: 'bg-success' },
  { libelle: 'Excellent', couleur: 'bg-success' },
] as const

export function IndicateurRobustesse({ motDePasse }: { motDePasse: string }) {
  const score = robustesseMotDePasse(motDePasse)
  const niveau = NIVEAUX[score]
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn('h-1.5 flex-1 rounded-pill transition-colors duration-150', i <= score ? niveau.couleur : 'bg-border')}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {score === 0
          ? 'Au moins 8 caractères ; mélangez majuscules, minuscules, chiffres et symboles.'
          : `Robustesse : ${niveau.libelle}`}
      </p>
    </div>
  )
}
