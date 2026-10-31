import { cn } from '@/lib/utils'

// Badge « Vérifié » — marque distincte du logo (docs/LOGO.md). N'apparaît que
// sur un profil ou un bien effectivement vérifié : c'est à l'appelant de ne
// le rendre que si verified / is_verified est vrai.
export function VerifiedBadge({ className, libelle = true }: { className?: string; libelle?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold text-success-texte', className)}>
      <img src="/keyli_verified_badge.svg" alt="" aria-hidden="true" className="h-5 w-5" />
      {libelle && 'Vérifié'}
    </span>
  )
}
