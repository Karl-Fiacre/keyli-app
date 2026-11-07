import { useLayoutEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { DUREE, EASE_CINEMA, EASE_RIDEAU } from '@/lib/cinema'

// Transition entre pages (registre cinématique, docs/ANIMATIONS.md) :
// - « rideau » (site public) : un rideau bleu nuit à liseré turquoise, logo
//   au centre, balaie l'écran pendant que la page change ; la nouvelle page
//   sort ensuite du flou en montant ;
// - « fondu » (tableaux de bord) : seulement la mise au point du contenu,
//   plus courte, pour ne pas freiner le travail quotidien.
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
  const { pathname } = useLocation()
  const navigation = useNavigationType()
  const reduit = useReducedMotion()
  const rubrique = pathname.split('/')[1] ?? ''
  const [initiale] = useState(rubrique)
  const [aNavigue, setANavigue] = useState(false)
  if (!aNavigue && rubrique !== initiale) setANavigue(true)

  useLayoutEffect(() => {
    if (navigation !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigation])

  const rideau = variante === 'rideau'
  const avecRideau = rideau && aNavigue && !reduit

  return (
    <>
      {avecRideau && (
        <motion.div
          key={`rideau-${rubrique}`}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-primary"
          initial={{ x: '-100%' }}
          animate={{ x: ['-100%', '0%', '0%', '100%'] }}
          transition={{ duration: 1.05, times: [0, 0.38, 0.52, 1], ease: EASE_RIDEAU }}
        >
          {/* Liseré lumineux turquoise sur le bord d'attaque du rideau */}
          <span className="absolute inset-y-0 right-0 w-1.5 bg-turquoise shadow-[0_0_48px_10px] shadow-turquoise/60" />
          <motion.img
            src="/keyli-logo-blanc-240.png"
            alt=""
            className="h-14 w-auto"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.85, 1, 1, 1.08] }}
            transition={{ duration: 1.05, times: [0.25, 0.4, 0.55, 0.75] }}
          />
        </motion.div>
      )}
      <motion.div
        key={rubrique}
        initial={{ opacity: 0, y: rideau ? 28 : 14, filter: rideau ? 'blur(12px)' : 'blur(6px)' }}
        animate={{
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          // Rien ne doit rester appliqué à la fin : un flou ou un décalage sur
          // ce conteneur casserait les éléments fixes ou collants des pages
          transitionEnd: { filter: 'none', transform: 'none' },
        }}
        transition={{
          duration: rideau ? DUREE.lente : DUREE.base,
          ease: EASE_CINEMA,
          // La page apparaît quand le rideau commence à se retirer
          delay: avecRideau ? 0.5 : 0,
        }}
      >
        {children}
      </motion.div>
    </>
  )
}
