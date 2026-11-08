import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'motion/react'
import { BadgeCheck, FileCheck2, MessageSquareQuote, ShieldCheck } from 'lucide-react'
import { FondScene } from '@/components/animation/FondScene'
import { RechercheRapide } from '@/components/accueil/RechercheRapide'
import { useCommunes } from '@/partage/hooks/useRecherche'
import { TexteCinema } from '@/components/animation/TexteCinema'
import { CarteInclinee } from '@/components/animation/CarteInclinee'
import { DUREE, EASE_CINEMA, transitionCinema } from '@/lib/cinema'

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

// Mise au point d'un élément de la bannière à l'ouverture (délai en secondes)
const entree = (delai: number) => ({
  initial: { opacity: 0, y: 28, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
  transition: transitionCinema(delai),
})

// Bannière d'accueil : promesse, recherche intégrée, garanties de confiance.
// Fond bleu nuit + motif de toits turquoise (registre « public »).
// Ouverture cinématique (docs/ANIMATIONS.md, 2026-11-07) : titre révélé mot
// à mot, halos qui dérivent, balayage de lumière, carte des garanties qui
// bascule en 3D ; au défilement, motif, halos et contenu se déplacent à des
// vitesses différentes (profondeur). Mouvements réduits : tout est fixe.
export function BanniereAccueil() {
  const scene = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: scene, offset: ['start start', 'end start'] })
  const contenuY = useTransform(scrollYProgress, [0, 1], [0, 140])
  const contenuOpacite = useTransform(scrollYProgress, [0, 0.75], [1, 0])
  const contenuEchelle = useTransform(scrollYProgress, [0, 1], [1, 0.94])

  const communes = useCommunes().data ?? []
  const phares = COMMUNES_PHARES.map((n) => communes.find((c) => c.nom === n)).filter(
    (c): c is { id: string; nom: string } => !!c,
  )

  return (
    <section ref={scene} className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <FondScene />

      <motion.div
        className="container grid gap-12 py-14 md:py-20 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-16"
        style={{ y: contenuY, opacity: contenuOpacite, scale: contenuEchelle }}
      >
        <div>
          <motion.p
            {...entree(0.1)}
            className="inline-flex items-center gap-2 rounded-pill border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground/85"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-turquoise" aria-hidden />
            Abidjan · Côte d’Ivoire
          </motion.p>
          <TexteCinema
            className="mt-5 font-titre text-4xl font-bold leading-[1.1] md:text-6xl"
            delai={0.25}
            segments={[
              { texte: 'Le logement de confiance, ' },
              { texte: 'vérifié avant vous.', className: 'text-turquoise' },
            ]}
          />
          <motion.p {...entree(0.85)} className="mt-5 max-w-xl text-base text-primary-foreground/80 md:text-lg">
            Fini les fausses annonces, les doubles locations et les frais de visite perdus. Sur Keyli, chaque bien
            vérifié l’est par notre équipe — vous visitez en toute sérénité.
          </motion.p>

          <motion.div {...entree(1.05)} className="relative mt-8">
            {/* Halo qui s'allume derrière la recherche quand elle se pose */}
            <motion.div
              aria-hidden
              className="absolute -inset-3 -z-10 rounded-accueil bg-turquoise/30 blur-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0.35] }}
              transition={{ duration: 2, delay: 1.3, times: [0, 0.4, 1] }}
            />
            <RechercheRapide />
          </motion.div>

          {phares.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <motion.span {...entree(1.25)} className="text-primary-foreground/70">
                Populaires :
              </motion.span>
              {phares.map((c, i) => (
                <motion.span
                  key={c.id}
                  initial={{ opacity: 0, scale: 0.6, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 1.35 + i * 0.07 }}
                >
                  <Link
                    to={`/recherche?commune=${c.id}`}
                    className="rounded-pill border border-primary-foreground/20 px-3 py-1 text-primary-foreground/90 transition-colors duration-150 hover:border-turquoise hover:text-turquoise focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turquoise"
                  >
                    {c.nom}
                  </Link>
                </motion.span>
              ))}
            </div>
          )}
        </div>

        {/* Carte « garanties » : ce que le badge Vérifié veut dire. Elle
            bascule en 3D à l'ouverture puis s'incline sous la souris. */}
        <motion.div
          style={{ perspective: 1200 }}
          initial={{ opacity: 0, y: 60, rotateX: 22, filter: 'blur(12px)' }}
          animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
          transition={{ duration: DUREE.scene, ease: EASE_CINEMA, delay: 0.55 }}
        >
          <CarteInclinee intensite={7}>
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
                  <motion.li
                    key={titre}
                    className="flex gap-4"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={transitionCinema(1.1 + i * 0.15)}
                  >
                    <motion.span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-turquoise/15"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 1.2 + i * 0.15 }}
                    >
                      <Icone className="h-5 w-5 text-turquoise" aria-hidden />
                    </motion.span>
                    <div>
                      <p className="font-semibold">{titre}</p>
                      <p className="text-sm text-primary-foreground/70">{texte}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </CarteInclinee>
        </motion.div>
      </motion.div>
    </section>
  )
}
