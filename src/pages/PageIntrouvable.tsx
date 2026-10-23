import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function PageIntrouvable() {
  return (
    <section className="container py-24 text-center">
      <h1 className="text-3xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
      <Button asChild className="mt-6">
        <Link to="/">Retour à l'accueil</Link>
      </Button>
    </section>
  )
}
