import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

// Session Supabase partagée dans toute l'application. Les pages lisent
// la session via useSession(), jamais directement via le client.
interface EtatSession {
  session: Session | null
  chargement: boolean
  // Dernier événement d'authentification (ex. PASSWORD_RECOVERY après un lien
  // de réinitialisation)
  dernierEvenement: AuthChangeEvent | null
}

const ContexteSession = createContext<EtatSession>({ session: null, chargement: true, dernierEvenement: null })

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatSession>({ session: null, chargement: true, dernierEvenement: null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEtat((e) => ({ ...e, session: data.session, chargement: false }))
    })
    const { data } = supabase.auth.onAuthStateChange((evenement, session) => {
      setEtat({ session, chargement: false, dernierEvenement: evenement })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <ContexteSession.Provider value={etat}>{children}</ContexteSession.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook associé au fournisseur
export function useSession() {
  return useContext(ContexteSession)
}
