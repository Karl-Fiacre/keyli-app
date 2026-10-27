import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useSession } from '@/hooks/useSession'
import { useFil, useMarquerLu, useRepondre } from '@/hooks/useMessagerie'
import { messageErreur } from '@/lib/erreurs'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/components/messagerie/ListeConversations'

const heure = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

// Fil d'une conversation : messages, marquage « lu » à l'ouverture réelle,
// zone de réponse (Entrée envoie, Maj+Entrée va à la ligne)
export function FilConversation({
  propertyId,
  interlocuteur,
  resume,
}: {
  propertyId: string | null
  interlocuteur: string
  resume?: Conversation
}) {
  const { session } = useSession()
  const moi = session?.user.id
  const fil = useFil(propertyId, interlocuteur)
  const marquerLu = useMarquerLu()
  const repondre = useRepondre()
  const [message, setMessage] = useState('')
  const bas = useRef<HTMLDivElement>(null)

  const messages = fil.data ?? []
  // Dernier message reçu encore non lu : déclenche le marquage, une seule fois
  const dernierNonLu = [...messages].reverse().find((m) => m.to_user === moi && !m.read)?.id
  const dejaMarque = useRef<string | undefined>(undefined)
  const { mutate: marquer } = marquerLu

  // Le destinataire a ouvert le fil : ses messages reçus deviennent lus
  useEffect(() => {
    if (!dernierNonLu || dejaMarque.current === dernierNonLu) return
    dejaMarque.current = dernierNonLu
    marquer({ propertyId, interlocuteur })
  }, [dernierNonLu, propertyId, interlocuteur, marquer])

  // Toujours afficher le dernier message
  useEffect(() => {
    bas.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const envoyer = () => {
    const texte = message.trim()
    if (!texte || repondre.isPending) return
    repondre.mutate({ propertyId, interlocuteur, message: texte }, { onSuccess: () => setMessage('') })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b p-4">
        <Button variant="ghost" asChild className="md:hidden" aria-label="Retour aux conversations">
          <Link to="/messages">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="truncate font-semibold">{resume?.nom_interlocuteur ?? 'Conversation'}</p>
          {propertyId && (
            <Link to={`/annonce/${propertyId}`} className="block truncate text-xs text-primary-glow hover:underline">
              {resume?.titre_annonce ?? 'Voir l\'annonce'}
            </Link>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {fil.isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {fil.isError && <Alert variant="erreur">{messageErreur(fil.error)}</Alert>}
        {messages.map((m) => {
          const deMoi = m.from_user === moi
          return (
            <div key={m.id} className={cn('flex', deMoi ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                  deMoi ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground',
                )}
              >
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={cn('mt-1 text-right text-[11px]', deMoi ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {heure(m.created_at ?? '')}
                  {deMoi && m.read && ' · Lu'}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bas} />
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          envoyer()
        }}
      >
        <label htmlFor="reponse" className="sr-only">
          Votre réponse
        </label>
        <textarea
          id="reponse"
          rows={2}
          maxLength={2000}
          value={message}
          placeholder="Écrire un message…"
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              envoyer()
            }
          }}
          className="min-h-11 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <Button type="submit" disabled={!message.trim() || repondre.isPending} aria-label="Envoyer">
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
      {repondre.isError && (
        <Alert variant="erreur" className="mx-3 mb-3">
          {messageErreur(repondre.error)}
        </Alert>
      )}
    </div>
  )
}
