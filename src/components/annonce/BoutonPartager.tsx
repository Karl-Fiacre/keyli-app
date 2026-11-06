import { useEffect, useRef, useState } from 'react'
import { Check, Link2, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Partage d'une annonce (Sprint 5) : feuille de partage du téléphone quand
// elle existe, sinon WhatsApp ou lien copié. Le lien porte la source
// « lien_direct » pour mesurer les visites venues d'un partage.
export function BoutonPartager({
  propertyId,
  titre,
  className,
}: {
  propertyId: string
  titre: string
  className?: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const [copie, setCopie] = useState(false)
  const zone = useRef<HTMLDivElement>(null)
  const lien = `${window.location.origin}/annonce/${propertyId}?source=lien_direct`
  const texte = `${titre} — sur Keyli`

  // Fermeture du menu au clic extérieur ou à la touche Échap
  useEffect(() => {
    if (!ouvert) return
    const clic = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false)
    }
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false)
    document.addEventListener('mousedown', clic)
    document.addEventListener('keydown', touche)
    return () => {
      document.removeEventListener('mousedown', clic)
      document.removeEventListener('keydown', touche)
    }
  }, [ouvert])

  const partager = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: texte, url: lien })
        return
      } catch (e) {
        // Partage annulé par l'utilisateur : rien à faire
        if ((e as DOMException).name === 'AbortError') return
      }
    }
    setOuvert((o) => !o)
  }

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // Presse-papiers refusé : on laisse le lien sélectionnable
      window.prompt('Copiez ce lien :', lien)
    }
  }

  const option =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none'

  return (
    <div ref={zone} className={cn('relative', className)}>
      <button
        type="button"
        onClick={partager}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label="Partager l’annonce"
        title="Partager l’annonce"
        className="inline-flex h-10 w-10 items-center justify-center rounded-pill border bg-background/90 shadow-sm transition-[transform,background-color] duration-150 hover:scale-105 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:scale-100"
      >
        <Share2 className="h-5 w-5" aria-hidden />
      </button>
      {ouvert && (
        <div role="menu" className="kf-zoom absolute right-0 z-20 mt-2 w-56 rounded-lg border bg-card p-1 shadow-lg">
          <a
            role="menuitem"
            href={`https://wa.me/?text=${encodeURIComponent(`${texte} ${lien}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={option}
            onClick={() => setOuvert(false)}
          >
            <Share2 className="h-4 w-4 text-success" aria-hidden />
            Envoyer par WhatsApp
          </a>
          <button type="button" role="menuitem" className={option} onClick={copier}>
            {copie ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            {copie ? 'Lien copié' : 'Copier le lien'}
          </button>
        </div>
      )}
    </div>
  )
}
