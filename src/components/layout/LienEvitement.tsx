// Lien « Aller au contenu » : invisible tant qu'il n'a pas le focus clavier,
// il permet de sauter l'en-tête et la navigation (WCAG 2.4.1).
export function LienEvitement() {
  return (
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
    >
      Aller au contenu
    </a>
  )
}
