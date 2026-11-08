import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Rocket, X } from 'lucide-react'
import { useEtapesDemarrage, type EtapeDemarrage } from '@/partage/hooks/useDemarrage'
import { useSession } from '@/partage/hooks/useSession'
import { cn } from '@/lib/utils'

interface InfoEtape {
  titre: string
  texte: string
  lien: string
}

function infos(agence: boolean): Record<EtapeDemarrage, InfoEtape> {
  return {
    profil: {
      titre: 'Compléter votre profil',
      texte: agence ? 'Nom de l’agence, nom du responsable et téléphone.' : 'Prénom, nom et téléphone.',
      lien: '/profil',
    },
    documents: {
      titre: agence ? 'Envoyer votre registre de commerce' : 'Envoyer vos pièces',
      texte: agence
        ? 'Obligatoire pour publier au nom de l’agence.'
        : 'Extrait de naissance et certificat de résidence.',
      lien: '/profil',
    },
    verification: {
      titre: 'Obtenir le badge « Vérifié »',
      texte: 'L’équipe Keyli examine vos documents ; vos annonces passent en tête des résultats.',
      lien: '/profil',
    },
    forfait: {
      titre: 'Choisir votre forfait',
      texte: 'Le nombre d’annonces dépend du forfait choisi.',
      lien: '/abonnement',
    },
    annonce: {
      titre: 'Publier votre première annonce',
      texte: 'Description, prix, position et au moins une photo.',
      lien: '/annonces/nouvelle',
    },
    equipe: {
      titre: 'Ajouter vos agents',
      texte: 'Attribuez chaque annonce à l’agent qui la suit.',
      lien: '/tableau-de-bord#equipe',
    },
  }
}

const CLE_MASQUE = 'keyli_demarrage_masque_'

// Parcours de démarrage (Sprint 4, accueil du panel pilote) : étapes
// calculées par la base, la prochaine mise en avant. Disparaît quand tout
// est fait ; peut être masqué (préférence de ce navigateur seulement).
export function ParcoursDemarrage({ agence }: { agence: boolean }) {
  const { session } = useSession()
  const etapes = useEtapesDemarrage()
  const cle = CLE_MASQUE + (session?.user.id ?? '')
  const [masque, setMasque] = useState(() => {
    try {
      return localStorage.getItem(cle) === '1'
    } catch {
      return false
    }
  })

  const liste = etapes.data ?? []
  const faites = liste.filter((e) => e.faite).length
  if (masque || liste.length === 0 || faites === liste.length) return null

  const textes = infos(agence)
  const prochaine = liste.find((e) => !e.faite)?.etape
  const masquer = () => {
    setMasque(true)
    try {
      localStorage.setItem(cle, '1')
    } catch {
      // stockage indisponible : masqué pour cette visite seulement
    }
  }

  return (
    <section className="kf-page rounded-lg border bg-card p-5 shadow-sm" aria-labelledby="titre-demarrage">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary-glow">
            <Rocket className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 id="titre-demarrage" className="font-semibold">
              Bien démarrer sur Keyli
            </h2>
            <p className="text-sm text-muted-foreground">
              {faites} étape{faites > 1 ? 's' : ''} sur {liste.length}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={masquer}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
          aria-label="Masquer le parcours de démarrage"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-pill bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={liste.length}
        aria-valuenow={faites}
        aria-label="Avancement du démarrage"
      >
        <div
          className="h-full rounded-pill bg-success transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${(faites / liste.length) * 100}%` }}
        />
      </div>

      <ol className="mt-4 divide-y">
        {liste.map(({ etape, faite }) => {
          const t = textes[etape]
          const active = etape === prochaine
          return (
            <li key={etape}>
              <Link
                to={t.lien}
                className={cn(
                  'group flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-secondary/60',
                  active && 'bg-secondary/60',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                    faite ? 'border-success bg-success text-primary-foreground' : 'border-muted-foreground/40',
                    active && 'border-primary-glow',
                  )}
                >
                  {faite && <Check className="h-3.5 w-3.5" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm font-semibold', faite && 'text-muted-foreground line-through')}>
                    {t.titre}
                  </span>
                  {!faite && <span className="block text-xs text-muted-foreground">{t.texte}</span>}
                  <span className="sr-only">{faite ? ' (fait)' : ' (à faire)'}</span>
                </span>
                {!faite && (
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
