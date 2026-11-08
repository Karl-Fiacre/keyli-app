import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useSession } from '@/partage/hooks/useSession'
import { useBasculerFavori, useIdsFavoris } from '@/partage/hooks/useFavoris'
import { cn } from '@/lib/utils'

// Cœur « favori » : bascule ajout / retrait. Sans compte, mène à la
// connexion puis revient sur la page en cours.
export function BoutonFavori({ propertyId, className }: { propertyId: string; className?: string }) {
  const { session } = useSession()
  const naviguer = useNavigate()
  const emplacement = useLocation()
  const ids = useIdsFavoris()
  const bascule = useBasculerFavori()
  // Petit battement du cœur à l'ajout (kf-battement), pas au chargement
  const [bat, setBat] = useState(false)
  // Affichage immédiat pendant l'envoi, sans attendre la base
  const enregistre = ids.data?.has(propertyId) ?? false
  const actif =
    bascule.isPending && bascule.variables?.propertyId === propertyId ? !bascule.variables.actif : enregistre

  return (
    <button
      type="button"
      aria-pressed={actif}
      aria-label={actif ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      title={actif ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      onClick={() => {
        if (!session) {
          naviguer('/connexion', { state: { depuis: emplacement.pathname + emplacement.search } })
          return
        }
        if (bascule.isPending) return
        setBat(!enregistre)
        bascule.mutate({ propertyId, actif: enregistre })
      }}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-pill bg-background/90 shadow-sm transition-[transform,background-color] duration-150 hover:scale-105 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:scale-100',
        className,
      )}
    >
      <Heart
        className={cn(
          'h-5 w-5 transition-colors duration-150',
          actif ? 'fill-destructive text-destructive' : 'text-foreground',
          bat && 'kf-battement',
        )}
        onAnimationEnd={() => setBat(false)}
        aria-hidden
      />
    </button>
  )
}
