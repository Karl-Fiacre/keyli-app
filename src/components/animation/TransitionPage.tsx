import { useLayoutEffect, type ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Transition entre pages : la page entrante apparaît en fondu (classe
// kf-page, docs/ANIMATIONS.md) et la fenêtre remonte en haut à chaque
// nouvelle page. Le retour arrière (POP) garde la position du navigateur.
// La clé est la première partie de l'adresse : changer de conversation ou
// de sous-page d'admin ne rejoue pas l'animation de tout l'écran.
export function TransitionPage({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const navigation = useNavigationType()
  const rubrique = pathname.split('/')[1] ?? ''

  useLayoutEffect(() => {
    if (navigation !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigation])

  return (
    <div key={rubrique} className="kf-page">
      {children}
    </div>
  )
}
