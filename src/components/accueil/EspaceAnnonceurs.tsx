import { Link } from 'react-router-dom'
import { BadgeCheck, BarChart3, Building2, CalendarClock, Check, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'
import { useProfil } from '@/hooks/useProfil'
import { ZoneRevele } from '@/components/animation/ZoneRevele'
import { delaiCascade } from '@/lib/animation'

const AVANTAGES = [
  { icone: BadgeCheck, texte: 'Badge « Vérifié » qui inspire confiance et vous place en tête des résultats' },
  { icone: CalendarClock, texte: 'Demandes de visite et messages centralisés, sans appels à toute heure' },
  { icone: BarChart3, texte: 'Tableau de bord : vues, contacts et visites de chaque annonce' },
]

// Appel aux propriétaires et agences : deux portes d'entrée, mêmes garanties
export function EspaceAnnonceurs() {
  const { session } = useSession()
  const role = useProfil().data?.role_keyli
  const annonceur = role === 'owner' || role === 'agency'
  // Un compte chercheur ou admin n'a rien à publier : section masquée
  if (session && !annonceur) return null

  return (
    <section className="container pb-16 md:pb-20" aria-labelledby="titre-annonceurs">
      <ZoneRevele>
        <div className="kf-revele relative isolate overflow-hidden rounded-accueil bg-primary px-6 py-12 text-primary-foreground shadow-lift md:px-12 md:py-14">
          <div
            aria-hidden
            className="absolute -bottom-24 -right-24 -z-10 h-72 w-72 rounded-full bg-turquoise/20 blur-3xl"
          />
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-turquoise">Propriétaires et agences</p>
              <h2 id="titre-annonceurs" className="mt-2 font-titre text-3xl font-bold md:text-4xl">
                Louez plus vite, à des locataires sérieux
              </h2>
              <ul className="mt-6 space-y-3">
                {AVANTAGES.map(({ icone: Icone, texte }, i) => (
                  <li key={texte} className="kf-revele flex gap-3" style={delaiCascade(i + 2, 90)}>
                    <Icone className="mt-0.5 h-5 w-5 shrink-0 text-turquoise" aria-hidden />
                    <span className="text-primary-foreground/85">{texte}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant="turquoise" size="lg" asChild>
                  <Link to={annonceur ? '/annonces/nouvelle' : '/inscription'}>
                    {annonceur ? 'Publier une annonce' : 'Publier mon bien'}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-glow"
                  asChild
                >
                  {annonceur ? (
                    <Link to="/abonnement">Voir les forfaits</Link>
                  ) : (
                    <Link to="/connexion">J’ai déjà un compte</Link>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Profil
                icone={Home}
                titre="Particulier propriétaire"
                points={['De 1 à 4 annonces', 'Vérification de vos pièces', 'Messagerie et visites incluses']}
              />
              <Profil
                icone={Building2}
                titre="Agence immobilière"
                points={['Jusqu’à 30 annonces et plus', 'Registre de commerce vérifié', 'Suivi des contacts (leads)']}
              />
            </div>
          </div>
        </div>
      </ZoneRevele>
    </section>
  )
}

function Profil({ icone: Icone, titre, points }: { icone: typeof Home; titre: string; points: string[] }) {
  return (
    <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/[0.06] p-5">
      <p className="flex items-center gap-2 font-semibold">
        <Icone className="h-5 w-5 text-turquoise" aria-hidden />
        {titre}
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-primary-foreground/80">
        {points.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}
