import { useLayoutEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { DUREE, EASE_CINEMA, EASE_RIDEAU, estRetourAnnonce, estTransitionPartagee } from '@/lib/cinema'

// Rubriques d'où l'on part pour une « grande entrée » dans le site : seul
// ce changement-là a droit au rideau (décision du porteur du 2026-11-26)
const GRANDES_ENTREES = ['', 'connexion', 'inscription']

// Transition entre pages (registre cinématique, docs/ANIMATIONS.md) :
// - « rideau » (site public) : un rideau bleu nuit à liseré turquoise, logo
//   au centre, balaie l'écran (~0,7 s) quand on quitte l'accueil, la
//   connexion ou l'inscription ; ailleurs, la page sort simplement du flou ;
// - « fondu » (tableaux de bord) : seulement la mise au point du contenu,
//   plus courte, pour ne pas freiner le travail quotidien.
// Transition partagée carte ↔ fiche (src/lib/cinema.ts) : c'est le
// navigateur qui anime, ce composant n'ajoute rien par-dessus.
// La clé est la première partie de l'adresse : changer de conversation ou
// de sous-page d'admin ne rejoue pas la transition. Pas de rideau au premier
// affichage du site. La fenêtre remonte en haut à chaque nouvelle page,
// sauf retour arrière (POP).
export function TransitionPage({
  children,
  variante = 'fondu',
}: {
  children: ReactNode
  variante?: 'rideau' | 'fondu'
}) {
  const { pathname, state } = useLocation()
  const navigation = useNavigationType()
  const reduit = useReducedMotion()
  const rubrique = pathname.split('/')[1] ?? ''
  // Rubrique affichée et celle d'avant, mises à jour pendant le rendu
  const [suivi, setSuivi] = useState<{ courante: string; precedente: string | null }>({
    courante: rubrique,
    precedente: null,
  })
  if (suivi.courante !== rubrique) setSuivi({ courante: rubrique, precedente: suivi.courante })

  useLayoutEffect(() => {
    if (navigation !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigation])

  const partagee = estTransitionPartagee(state) || estRetourAnnonce(state)
  const rideau = variante === 'rideau'
  const avecRideau =
    rideau &&
    !reduit &&
    !partagee &&
    suivi.precedente !== null &&
    GRANDES_ENTREES.includes(suivi.precedente)

  return (
    <>
      {avecRideau && (
        <motion.div
          key={`rideau-${rubrique}`}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-primary"
          initial={{ x: '-100%' }}
          animate={{ x: ['-100%', '0%', '0%', '100%'] }}
          transition={{ duration: 0.7, times: [0, 0.4, 0.5, 1], ease: EASE_RIDEAU }}
        >
          {/* Liseré lumineux turquoise sur le bord d'attaque du rideau */}
          <span className="absolute inset-y-0 right-0 w-1.5 bg-turquoise shadow-[0_0_48px_10px] shadow-turquoise/60" />
          <motion.img
            src="/keyli-logo-blanc-240.png"
            alt=""
            className="h-14 w-auto"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.85, 1, 1, 1.08] }}
            transition={{ duration: 0.7, times: [0.2, 0.38, 0.55, 0.75] }}
          />
        </motion.div>
      )}
      <motion.div
        key={rubrique}
        // Transition partagée : la page est là tout de suite, le navigateur
        // fait le mouvement
        initial={
          partagee ? false : { opacity: 0, y: rideau ? 20 : 14, filter: rideau ? 'blur(8px)' : 'blur(6px)' }
        }
        animate={{
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          // Rien ne doit rester appliqué à la fin : un flou ou un décalage sur
          // ce conteneur casserait les éléments fixes ou collants des pages
          transitionEnd: { filter: 'none', transform: 'none' },
        }}
        transition={{
          duration: avecRideau ? DUREE.base : DUREE.rapide + 0.1,
          ease: EASE_CINEMA,
          // La page apparaît quand le rideau commence à se retirer
          delay: avecRideau ? 0.32 : 0,
        }}
      >
        {children}
      </motion.div>
    </>
  )
}
