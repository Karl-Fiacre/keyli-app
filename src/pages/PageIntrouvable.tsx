import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { TexteCinema } from '@/components/animation/TexteCinema'
import { useTitrePage } from '@/hooks/useTitrePage'

export default function PageIntrouvable() {
  useTitrePage('Page introuvable')
  return (
    <section className="container py-24 text-center">
      <TexteCinema className="text-3xl font-bold" segments={[{ texte: 'Page introuvable' }]} />
      <p className="mt-2 text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
      <Button asChild className="mt-6">
        <Link to="/">Retour à l'accueil</Link>
      </Button>
    </section>
  )
}
