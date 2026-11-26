import type { MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, type To } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'

// Navigation avec transition partagée (API View Transitions du navigateur,
// src/lib/cinema.ts). L'option `viewTransition` de React Router n'agit
// qu'avec son routeur « de données » ; le site utilise BrowserRouter, on
// appelle donc l'API nous-mêmes. À brancher sur le onClick d'un <Link> :
// - clic simple : le navigateur photographie la page, React affiche la
//   nouvelle de façon synchrone (flushSync), puis les éléments de même nom
//   (view-transition-name) voyagent de l'une à l'autre ;
// - Ctrl/Cmd/Maj-clic, clic du milieu, navigateur sans l'API ou mouvements
//   réduits : le lien garde son comportement normal.
// `avant` s'exécute juste avant la photo (ex. nommer l'élément qui voyage).
export function useNavigationPartagee() {
  const naviguer = useNavigate()
  const reduit = useReducedMotion()

  return (evenement: MouseEvent<HTMLAnchorElement>, vers: To, etat?: unknown, avant?: () => void) => {
    if (
      evenement.defaultPrevented ||
      evenement.button !== 0 ||
      evenement.metaKey ||
      evenement.ctrlKey ||
      evenement.shiftKey ||
      evenement.altKey ||
      reduit ||
      typeof document.startViewTransition !== 'function'
    ) {
      return
    }
    evenement.preventDefault()
    avant?.()
    // Une seule navigation, quel que soit le chemin qui la déclenche
    let fait = false
    const aller = () => {
      if (fait) return
      fait = true
      flushSync(() => naviguer(vers, { state: etat }))
    }
    const transition = document.startViewTransition(aller)
    // Une transition sautée rejette ces promesses : c'est attendu, on les
    // absorbe pour ne pas polluer la console
    const ignorer = () => {}
    transition.ready.catch(ignorer)
    transition.updateCallbackDone.catch(ignorer)
    transition.finished.catch(ignorer)
    // Filet de sécurité : si le navigateur ne dessine pas (onglet en
    // arrière-plan, appareil saturé), on n'attend pas la transition — un
    // clic ne doit jamais rester sans effet
    window.setTimeout(() => {
      if (fait) return
      transition.skipTransition()
      aller()
    }, 400)
  }
}
