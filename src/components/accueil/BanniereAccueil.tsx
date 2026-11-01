import { Link } from 'react-router-dom'
import { BadgeCheck, FileCheck2, MessageSquareQuote, ShieldCheck } from 'lucide-react'
import { MotifToits } from '@/components/accueil/MotifToits'
import { RechercheRapide } from '@/components/accueil/RechercheRapide'
import { useCommunes } from '@/hooks/useRecherche'

// Communes mises en avant sous la recherche (raccourcis), si elles existent
const COMMUNES_PHARES = ['Cocody', 'Marcory', 'Plateau', 'Yopougon', 'Koumassi', 'Treichville']

const GARANTIES = [
  {
    icone: FileCheck2,
    titre: 'Documents contrôlés',
    texte: 'Pièces du propriétaire (ACD, état civil…) contrôlées par l’équipe Keyli',
  },
  { icone: ShieldCheck, titre: 'Agences identifiées', texte: 'Registre de commerce exigé pour chaque agence' },
  { icone: MessageSquareQuote, titre: 'Avis après visite', texte: 'Seuls les visiteurs réels peuvent noter un bien' },
]

// Bannière d'accueil : promesse, recherche intégrée, garanties de confiance.
// Fond bleu nuit + motif de toits turquoise discret (registre « public »).
export function BanniereAccueil() {
  const communes = useCommunes().data ?? []
  const phares = COMMUNES_PHARES.map((n) => communes.find((c) => c.nom === n)).filter(
    (c): c is { id: string; nom: string } => !!c,
  )

  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <MotifToits className="absolute inset-0 -z-10 h-full w-full opacity-[0.12]" />
      {/* Halo turquoise derrière le titre (dégradé radial, pas d'image) */}
      <div
        aria-hidden
        className="absolute -right-32 -top-32 -z-10 h-[28rem] w-[28rem] rounded-full bg-turquoise/25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-24 -z-10 h-96 w-96 rounded-full bg-primary-glow/40 blur-3xl"
      />

      <div className="container grid gap-12 py-14 md:py-20 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-16">
        <div className="kf-cascade">
          <p className="inline-flex items-center gap-2 rounded-pill border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground/85">
            <span className="h-1.5 w-1.5 rounded-full bg-turquoise" aria-hidden />
            Abidjan · Côte d’Ivoire
          </p>
          <h1 className="mt-5 font-titre text-4xl font-bold leading-[1.1] md:text-6xl">
            Le logement de confiance, <span className="text-turquoise">vérifié avant vous.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-primary-foreground/80 md:text-lg">
            Fini les fausses annonces, les doubles locations et les frais de visite perdus. Sur Keyli, chaque bien
            vérifié l’est par notre équipe — vous visitez en toute sérénité.
          </p>

          <div className="mt-8">
            <RechercheRapide />
          </div>

          {phares.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-primary-foreground/70">Populaires :</span>
              {phares.map((c) => (
                <Link
                  key={c.id}
                  to={`/recherche?commune=${c.id}`}
                  className="rounded-pill border border-primary-foreground/20 px-3 py-1 text-primary-foreground/90 transition-colors duration-150 hover:border-turquoise hover:text-turquoise focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquoise"
                >
                  {c.nom}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Carte « garanties » : ce que le badge Vérifié veut dire */}
        <div className="kf-cascade [--kf-delai:120ms]">
          <div className="rounded-accueil border border-primary-foreground/15 bg-primary-foreground/[0.06] p-6 backdrop-blur-sm md:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success/15">
                <BadgeCheck className="h-6 w-6 text-success" aria-hidden />
              </span>
              <div>
                <p className="font-titre text-xl font-bold">Que garantit le badge « Vérifié » ?</p>
                <p className="text-sm text-primary-foreground/70">Trois contrôles avant publication</p>
              </div>
            </div>
            <ul className="mt-6 space-y-5">
              {GARANTIES.map(({ icone: Icone, titre, texte }, i) => (
                <li
                  key={titre}
                  className="kf-cascade flex gap-4"
                  style={{ ['--kf-delai' as string]: `${200 + i * 60}ms` }}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-turquoise/15">
                    <Icone className="h-5 w-5 text-turquoise" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">{titre}</p>
                    <p className="text-sm text-primary-foreground/70">{texte}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
