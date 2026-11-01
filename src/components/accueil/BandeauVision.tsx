import { MotifToits } from '@/components/accueil/MotifToits'

// Étapes de l'ambition (docs/CONTEXT.md : pilote Abidjan, puis sous-région).
// Formulées comme une trajectoire, sans date ni chiffre promis.
const ETAPES = [
  { lieu: 'Abidjan', etat: 'Pilote en cours', actif: true },
  { lieu: 'Côte d’Ivoire', etat: 'Grandes villes ensuite', actif: false },
  { lieu: 'Afrique de l’Ouest', etat: 'La référence sous-régionale', actif: false },
]

export function BandeauVision() {
  return (
    <section
      className="relative isolate overflow-hidden border-t bg-background py-16 md:py-20"
      aria-labelledby="titre-vision"
    >
      <MotifToits className="absolute inset-0 -z-10 h-full w-full opacity-[0.07]" />
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="titre-vision" className="font-titre text-3xl font-bold md:text-4xl">
            Abidjan aujourd’hui. <span className="text-primary-glow">L’Afrique de l’Ouest demain.</span>
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Keyli construit le standard de confiance de l’immobilier ouest-africain : des annonces vraies, des
            annonceurs identifiés, des avis qui comptent.
          </p>
        </div>
        <ol className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {ETAPES.map((e, i) => (
            <li
              key={e.lieu}
              className={
                e.actif
                  ? 'rounded-accueil border-2 border-turquoise bg-card p-5 text-center shadow-card'
                  : 'rounded-accueil border border-dashed bg-card/70 p-5 text-center'
              }
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Étape {i + 1}</p>
              <p className="mt-1 font-titre text-xl font-bold">{e.lieu}</p>
              <p
                className={
                  e.actif ? 'mt-1 text-sm font-semibold text-success-texte' : 'mt-1 text-sm text-muted-foreground'
                }
              >
                {e.actif && (
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-success align-middle" aria-hidden />
                )}
                {e.etat}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
