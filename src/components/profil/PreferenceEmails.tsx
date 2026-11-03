import { Alert } from '@/components/ui/alert'
import { usePreferenceEmails } from '@/hooks/useEmails'
import { messageErreur } from '@/lib/erreurs'
import { cn } from '@/lib/utils'

// Interrupteur « Recevoir les notifications par email » du profil
// (docs/MODULES/emails.md). Enregistré dès le basculement.
export function PreferenceEmails({ actif }: { actif: boolean }) {
  const preference = usePreferenceEmails()
  // Affichage immédiat pendant l'enregistrement
  const valeur = preference.isPending ? (preference.variables ?? actif) : actif

  return (
    <div id="emails" className="mt-8 border-t pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="titre-emails" className="font-semibold">
            Notifications par email
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nouveaux messages, réservations, visites, vérification, abonnement et alertes de recherche. Les emails
            importants sur votre compte (suspension, vérification retirée) restent envoyés.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={valeur}
          aria-labelledby="titre-emails"
          disabled={preference.isPending}
          onClick={() => preference.mutate(!valeur)}
          className={cn(
            'relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60',
            valeur ? 'bg-primary' : 'bg-input',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform duration-150 motion-reduce:transition-none',
              valeur ? 'translate-x-[22px]' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>
      {preference.isError && (
        <Alert variant="erreur" className="mt-3">
          {messageErreur(preference.error)}
        </Alert>
      )}
    </div>
  )
}
