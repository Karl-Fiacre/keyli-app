import { Etoiles } from '@/components/avis/Etoiles'
import { useAvisRecus } from '@/hooks/useVisites'
import { formatDate } from '@/lib/format'

// Avis publics reçus par un annonceur (fiche d'annonce)
export function ListeAvis({ userId }: { userId: string }) {
  const avis = useAvisRecus(userId)
  if (avis.isPending || !avis.data) return null
  if (avis.data.length === 0) {
    return <p className="text-sm text-muted-foreground">Pas encore d'avis : ils apparaissent après une visite.</p>
  }
  return (
    <ul className="space-y-4">
      {avis.data.map((a) => (
        <li key={a.id} className="space-y-1 border-b pb-4 last:border-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2">
            <Etoiles note={a.note} />
            <span className="text-sm font-semibold">{a.auteur}</span>
            <span className="text-xs text-muted-foreground">· {formatDate(a.date_avis)}</span>
          </div>
          {a.titre_bien && <p className="text-xs text-muted-foreground">Visite de « {a.titre_bien} »</p>}
          {a.commentaire && <p className="whitespace-pre-line text-sm">{a.commentaire}</p>}
        </li>
      ))}
    </ul>
  )
}
