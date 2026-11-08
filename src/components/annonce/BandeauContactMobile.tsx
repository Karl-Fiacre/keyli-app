import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signalerIntentionContact } from '@/partage/hooks/useConversion'

// Bandeau de contact toujours visible sur mobile et tablette (Sprint 8,
// docs/MODULES/conversion.md) : sur petit écran, le formulaire de contact
// est en bas de la fiche. Le bouton y mène et compte une intention de
// contact. La page réserve sa hauteur en bas (classe sur <body>, voir
// index.css) pour que le bandeau ne cache jamais le pied de page. Rendu
// directement dans <body> : la transition de page (transform, flou) ne
// doit pas le déplacer.
export function BandeauContactMobile({
  propertyId,
  prix,
  libelle,
}: {
  propertyId: string
  prix: ReactNode
  libelle: string
}) {
  useEffect(() => {
    document.body.classList.add('avec-bandeau-contact')
    return () => document.body.classList.remove('avec-bandeau-contact')
  }, [])

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 shadow-card backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <p className="min-w-0 truncate font-semibold">{prix}</p>
        <Button asChild className="shrink-0">
          <a href="#contact-annonceur" onClick={() => signalerIntentionContact(propertyId)}>
            <MessageCircle className="h-4 w-4" aria-hidden />
            {libelle}
          </a>
        </Button>
      </div>
    </div>,
    document.body,
  )
}
