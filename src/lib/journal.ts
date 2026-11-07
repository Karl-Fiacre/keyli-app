import { supabase } from '@/integrations/supabase/client'

// Journal des erreurs (Sprint 6, docs/MODULES/stabilisation.md) : les
// erreurs inattendues sont envoyées à la base (journaliser_erreur_keyli),
// qui masque emails et numéros. Côté navigateur : pas de doublon, au plus
// 10 envois par page ouverte, jamais d'erreur levée par le journal lui-même.
const deja = new Set<string>()
let envoyes = 0
const MAX_ENVOIS = 10

// Erreurs « attendues » déjà expliquées à l'utilisateur : pas journalisées
const CODES_ATTENDUS = new Set(['42501', '23514', '23505', '22023', 'KEYLI', 'KY001', 'KY002', 'KY003', 'KY004'])

export function journaliserErreur(erreur: unknown, origine = 'application') {
  try {
    const e = (erreur ?? {}) as { message?: unknown; code?: unknown; name?: unknown }
    const code = typeof e.code === 'string' ? e.code : typeof e.name === 'string' ? e.name : null
    if (code && CODES_ATTENDUS.has(code)) return
    const message = (typeof e.message === 'string' ? e.message : String(erreur)).slice(0, 500)
    // Hors ligne ou requête annulée : ce n'est pas un défaut de l'application
    if (/Failed to fetch|NetworkError|Load failed|AbortError/i.test(message)) return
    const cle = `${origine}|${code}|${message}`
    if (deja.has(cle) || envoyes >= MAX_ENVOIS) return
    deja.add(cle)
    envoyes += 1
    void supabase
      .rpc('journaliser_erreur_keyli', {
        p_page: window.location.pathname,
        p_message: `[${origine}] ${message}`,
        p_code: code ?? undefined,
        p_navigateur: navigator.userAgent.slice(0, 200),
      })
      .then(
        () => undefined,
        () => undefined,
      )
  } catch {
    // Le journal ne doit jamais casser l'application
  }
}

// Erreurs non rattrapées du navigateur (scripts, promesses)
export function installerJournalGlobal() {
  window.addEventListener('error', (ev) => journaliserErreur(ev.error ?? ev.message, 'script'))
  window.addEventListener('unhandledrejection', (ev) => journaliserErreur(ev.reason, 'promesse'))
}
