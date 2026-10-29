import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'

// Accueil provisoire : accès à la recherche (Sprint 2) ; les quartiers
// populaires et les annonces mises en avant arriveront ensuite. Registre « public
// chaleureux » de DESIGN_SYSTEM.md : accent turquoise, titres Cambria, rayon accueil.
export default function Accueil() {
  const { session } = useSession()
  return (
    <section className="container py-16 md:py-24">
      <div className="mx-auto max-w-3xl rounded-accueil bg-primary px-6 py-14 text-center text-primary-foreground shadow-lift md:px-12">
        <h1 className="font-titre text-4xl font-bold leading-tight md:text-5xl">
          Trouvez un logement de confiance à Abidjan
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/80">
          Des annonces vérifiées par notre équipe, des propriétaires et des agences identifiés, des avis réels
          après visite.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="turquoise" size="lg" asChild>
            <Link to="/recherche">Voir les logements</Link>
          </Button>
          {session ? (
            <Button
              variant="outline"
              size="lg"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-glow"
              asChild
            >
              <Link to="/profil">Accéder à mon compte</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-glow"
              asChild
            >
              <Link to="/inscription">Créer un compte gratuit</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
