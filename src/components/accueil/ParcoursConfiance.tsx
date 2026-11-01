import { CalendarCheck, MessagesSquare, Search, Star } from 'lucide-react'

const ETAPES = [
  {
    icone: Search,
    titre: 'Cherchez',
    texte: 'Filtrez par commune, quartier, budget et équipements. Les biens vérifiés passent en premier.',
  },
  {
    icone: MessagesSquare,
    titre: 'Échangez',
    texte: 'Écrivez à l’annonceur dans la messagerie Keyli, gratuitement, sans démarcheur au milieu.',
  },
  {
    icone: CalendarCheck,
    titre: 'Visitez',
    texte: 'Planifiez la visite en ligne : date, heure et rappel, tout est noté au même endroit.',
  },
  {
    icone: Star,
    titre: 'Notez',
    texte: 'Après la visite, laissez un avis. Il aide les suivants et récompense les annonceurs sérieux.',
  },
]

// « Comment ça marche » : quatre étapes reliées par un filet turquoise
export function ParcoursConfiance() {
  return (
    <section className="bg-secondary py-16 md:py-20" aria-labelledby="titre-parcours">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-glow">Comment ça marche</p>
          <h2 id="titre-parcours" className="mt-1 font-titre text-3xl font-bold md:text-4xl">
            De la recherche aux clés, en confiance
          </h2>
        </div>
        <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
          {/* Filet qui relie les étapes sur grand écran */}
          <span
            aria-hidden
            className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-gradient-to-r from-turquoise/0 via-turquoise to-turquoise/0 md:block"
          />
          {ETAPES.map(({ icone: Icone, titre, texte }, i) => (
            <li key={titre} className="relative text-center">
              <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card ring-4 ring-secondary">
                <Icone className="h-6 w-6" aria-hidden />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-turquoise text-xs font-bold text-primary">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-4 text-lg font-bold">{titre}</h3>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{texte}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
