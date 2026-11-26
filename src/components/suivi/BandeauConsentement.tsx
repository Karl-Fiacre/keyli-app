import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Apparition } from '@/components/animation/Apparition'
import {
  chargerOutils,
  enregistrerConsentement,
  lireConsentement,
  nomsOutils,
  suiviConfigure,
  suivrePage,
} from '@/lib/suivi'

// Bandeau de consentement aux cookies publicitaires (Meta, TikTok) —
// décision du porteur du 2026-11-14. « Refuser » est aussi visible
// qu'« Accepter » ; sans choix, rien n'est chargé. N'apparaît pas si aucun
// identifiant n'est configuré. Suit aussi les changements de page.
export function BandeauConsentement() {
  const [visible, setVisible] = useState(() => suiviConfigure() && lireConsentement() === null)
  const { pathname } = useLocation()

  // Choix déjà donné lors d'une visite précédente ; réouverture depuis le
  // pied de page
  useEffect(() => {
    chargerOutils()
    const rouvrir = () => setVisible(suiviConfigure() && lireConsentement() === null)
    window.addEventListener('keyli:consentement', rouvrir)
    return () => window.removeEventListener('keyli:consentement', rouvrir)
  }, [])

  useEffect(() => {
    suivrePage()
  }, [pathname])

  const choisir = (choix: 'accepte' | 'refuse') => {
    enregistrerConsentement(choix)
    setVisible(false)
  }

  return (
    <Apparition
      visible={visible}
      variante="bandeau"
      role="dialog"
      aria-labelledby="titre-consentement"
      aria-describedby="texte-consentement"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-card p-4 shadow-lift md:inset-x-auto md:bottom-4 md:left-4 md:max-w-md md:rounded-lg md:border"
    >
      <p id="titre-consentement" className="font-semibold">
        Cookies publicitaires
      </p>
      <p id="texte-consentement" className="mt-1 text-sm text-muted-foreground">
        Avec votre accord, Keyli utilise les outils de mesure de {nomsOutils()} pour savoir quelles publicités vous ont
        amené ici. Aucune donnée de votre compte ne leur est transmise.{' '}
        <Link to="/confidentialite#stockage-navigateur" className="font-semibold text-primary-glow hover:underline">
          En savoir plus
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => choisir('refuse')}>
          Refuser
        </Button>
        <Button onClick={() => choisir('accepte')}>Accepter</Button>
      </div>
    </Apparition>
  )
}
