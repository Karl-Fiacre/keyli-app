import { CarteAnnonce } from '@/components/annonce/CarteAnnonce'
import { Revele } from '@/components/animation/Revele'
import { useAnnoncesSimilaires } from '@/hooks/useConversion'

// Bas de fiche (Sprint 8, docs/MODULES/conversion.md) : jusqu'à 4 annonces
// proches (même quartier, même commune, même type, prix voisin), pour ne
// pas perdre un visiteur que ce bien ne convainc pas. Rien sans résultat.
export function AnnoncesSimilaires({ id }: { id: string }) {
  const similaires = useAnnoncesSimilaires(id)
  if (!similaires.data?.length) return null

  return (
    <section className="container pb-12" aria-labelledby="titre-similaires">
      <h2 id="titre-similaires" className="mb-4 text-xl font-semibold">
        Ces biens peuvent aussi vous intéresser
      </h2>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {similaires.data.map((a, i) => (
          <Revele as="li" key={a.id} delai={i * 0.08}>
            <CarteAnnonce annonce={a} source="recommandation" />
          </Revele>
        ))}
      </ul>
    </section>
  )
}
