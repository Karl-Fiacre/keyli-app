import { useParams } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { FilConversation } from '@/components/messagerie/FilConversation'
import { ListeConversations } from '@/components/messagerie/ListeConversations'
import { estUuid, useConversations } from '@/hooks/useMessagerie'
import { messageErreur } from '@/lib/erreurs'
import { cheminConversation } from '@/lib/messagerie'
import { cn } from '@/lib/utils'

// Messagerie Keyli (gratuite, docs/MODULES/messagerie.md) : liste des
// conversations et fil ouvert côte à côte ; sur mobile, l'un ou l'autre.
export default function Messages() {
  const { bien, interlocuteur } = useParams()
  const conversations = useConversations()

  const propertyId = bien && bien !== 'direct' ? bien : null
  const filValide = estUuid(interlocuteur) && (propertyId === null || estUuid(propertyId))
  const filOuvert = !!interlocuteur
  const actif = filValide ? cheminConversation({ property_id: propertyId, interlocuteur }) : undefined
  const resume = conversations.data?.find((c) => cheminConversation(c) === actif)

  return (
    <section>
      <h1 className={cn('mb-4 text-2xl font-bold tracking-tight', filOuvert && 'hidden md:block')}>Messages</h1>
      <div className="grid h-[calc(100dvh-14rem)] lg:h-[calc(100dvh-11rem)] min-h-[28rem] overflow-hidden rounded-lg border bg-card md:grid-cols-[22rem_1fr]">
        <div className={cn('min-h-0 overflow-y-auto border-r', filOuvert && 'hidden md:block')}>
          {conversations.isPending && <p className="p-6 text-sm text-muted-foreground">Chargement…</p>}
          {conversations.isError && (
            <Alert variant="erreur" className="m-4">
              {messageErreur(conversations.error)}
            </Alert>
          )}
          {conversations.data && <ListeConversations conversations={conversations.data} active={actif} />}
        </div>
        <div className={cn('min-h-0', !filOuvert && 'hidden md:block')}>
          {filOuvert && filValide ? (
            <FilConversation
              key={actif}
              propertyId={propertyId}
              interlocuteur={interlocuteur as string}
              resume={resume}
            />
          ) : filOuvert ? (
            <p className="p-6 text-sm text-muted-foreground">Conversation introuvable.</p>
          ) : (
            <p className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
              Sélectionnez une conversation.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
