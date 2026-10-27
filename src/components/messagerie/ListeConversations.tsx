import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { cn } from '@/lib/utils'
import { cheminConversation } from '@/lib/messagerie'

export interface Conversation {
  property_id: string | null
  titre_annonce: string | null
  image_annonce: string | null
  interlocuteur: string
  nom_interlocuteur: string | null
  interlocuteur_verifie: boolean
  dernier_message: string
  dernier_envoi: string
  envoye_par_moi: boolean
  non_lus: number
}

// Heure si aujourd'hui, sinon date courte
function horodatage(iso: string) {
  const d = new Date(iso)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

// Liste des conversations, la plus récente d'abord, non-lus mis en avant
export function ListeConversations({ conversations, active }: { conversations: Conversation[]; active?: string }) {
  if (conversations.length === 0) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Aucune conversation pour l'instant. Écrivez à un annonceur depuis une annonce pour en démarrer une.
      </p>
    )
  }
  return (
    <ul className="divide-y">
      {conversations.map((c) => {
        const chemin = cheminConversation(c)
        const nonLus = Number(c.non_lus)
        return (
          <li key={chemin}>
            <Link
              to={chemin}
              aria-current={active === chemin ? 'page' : undefined}
              className={cn(
                'flex gap-3 p-4 transition-colors duration-150 hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none',
                active === chemin && 'bg-secondary',
              )}
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {c.image_annonce ? (
                  <img src={c.image_annonce} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Home className="h-5 w-5" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('flex min-w-0 items-center gap-1.5 text-sm', nonLus > 0 ? 'font-bold' : 'font-semibold')}>
                    <span className="truncate">{c.nom_interlocuteur ?? 'Membre Keyli'}</span>
                    {c.interlocuteur_verifie && <VerifiedBadge libelle={false} className="shrink-0" />}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">{horodatage(c.dernier_envoi)}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.titre_annonce ?? 'Annonce plus disponible'}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('truncate text-sm', nonLus > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                    {c.envoye_par_moi && 'Vous : '}
                    {c.dernier_message}
                  </p>
                  {nonLus > 0 && (
                    <span className="shrink-0 rounded-pill bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                      {nonLus}
                      <span className="sr-only"> non lu{nonLus > 1 ? 's' : ''}</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
