import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/hooks/useSession'
import { useProfil } from '@/hooks/useProfil'
import { useAcceptationCgu } from '@/hooks/useCgu'
import { messageErreur } from '@/lib/erreurs'
import { PAGES_JURIDIQUES, VERSION_CGU } from '@/lib/juridique'

// Acceptation à la prochaine connexion (décision du porteur, 2026-11-04) :
// un compte connecté qui n'a pas accepté la version en vigueur voit cet
// écran à la place de la page demandée. Les pages légales restent lisibles.
// Les visiteurs non connectés ne sont pas concernés.
export function PorteCgu({ children }: { children: ReactNode }) {
  const { session } = useSession()
  const profil = useProfil()
  const { pathname } = useLocation()

  const aAccepter =
    !!session && !!profil.data && profil.data.cgu_version !== VERSION_CGU && !PAGES_JURIDIQUES.includes(pathname)

  if (!aAccepter) return <>{children}</>
  return <EcranAcceptation dejaAcceptees={!!profil.data?.cgu_version} />
}

function EcranAcceptation({ dejaAcceptees }: { dejaAcceptees: boolean }) {
  const acceptation = useAcceptationCgu()
  const [coche, setCoche] = useState(false)
  const lien = 'font-semibold text-primary-glow hover:underline'

  return (
    <section className="flex justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <ScrollText className="h-8 w-8 text-primary-glow" aria-hidden />
          <CardTitle className="mt-2">
            {dejaAcceptees ? 'Nos conditions ont évolué' : 'Conditions d’utilisation'}
          </CardTitle>
          <CardDescription>
            Pour continuer à utiliser votre compte, prenez connaissance des conditions et acceptez-les.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={coche}
              onChange={(e) => setCoche(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              J’accepte les{' '}
              <Link to="/conditions" target="_blank" className={lien}>
                conditions générales d’utilisation
              </Link>{' '}
              et j’ai lu la{' '}
              <Link to="/confidentialite" target="_blank" className={lien}>
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
          {acceptation.isError && <Alert variant="erreur">{messageErreur(acceptation.error)}</Alert>}
          <Button className="w-full" disabled={!coche || acceptation.isPending} onClick={() => acceptation.mutate()}>
            {acceptation.isPending ? 'Enregistrement…' : 'Continuer'}
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
