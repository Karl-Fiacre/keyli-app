import { Fragment } from 'react'
import { motion } from 'motion/react'
import { DUREE, EASE_CINEMA } from '@/lib/cinema'

export interface Segment {
  texte: string
  className?: string
}

// Titre révélé mot à mot : chaque mot sort d'un masque en montant, avec un
// léger décalage (générique de film). Le texte complet reste lisible par
// les lecteurs d'écran (aria-label), les mots animés sont masqués pour eux.
// `segments` permet de colorer une partie du titre.
export function TexteCinema({
  segments,
  delai = 0,
  pas = 0.07,
  quandVisible = false,
  className,
  id,
  as = 'h1',
}: {
  segments: Segment[]
  delai?: number
  pas?: number
  // false : joue au chargement (titre de bannière) ; true : à l'entrée dans l'écran
  quandVisible?: boolean
  className?: string
  id?: string
  as?: 'h1' | 'h2' | 'p'
}) {
  const Balise = as
  const complet = segments.map((s) => s.texte).join('')
  let rang = 0
  const declenche = quandVisible
    ? { whileInView: 'visible' as const, viewport: { once: true, margin: '0px 0px -10% 0px' } }
    : { animate: 'visible' as const }

  return (
    <Balise id={id} className={className} aria-label={complet}>
      <motion.span aria-hidden initial="cache" {...declenche} className="block">
        {segments.map((s, i) => (
          <span key={i} className={s.className}>
            {s.texte.split(/(\s+)/).map((mot, j) => {
              if (!mot) return null
              if (/^\s+$/.test(mot)) return <Fragment key={j}> </Fragment>
              const d = delai + rang++ * pas
              return (
                // Le masque (overflow) coupe le mot pendant sa montée
                <span key={j} className="inline-block overflow-hidden pb-[0.12em] align-top">
                  <motion.span
                    className="inline-block"
                    variants={{
                      cache: { y: '110%', rotate: 4, opacity: 0 },
                      visible: {
                        y: '0%',
                        rotate: 0,
                        opacity: 1,
                        transition: { duration: DUREE.lente, ease: EASE_CINEMA, delay: d },
                      },
                    }}
                  >
                    {mot}
                  </motion.span>
                </span>
              )
            })}
          </span>
        ))}
      </motion.span>
    </Balise>
  )
}
