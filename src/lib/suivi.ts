// Outils de suivi publicitaire Meta (Facebook, Instagram) et TikTok —
// décision du porteur du 2026-11-14 (docs/MODULES/publicite-pilote-villes.md,
// docs/PRD_REGLES.md « PILOTE NATIONAL »).
//
// Règles :
// - rien n'est chargé sans le CONSENTEMENT explicite du visiteur (bandeau
//   BandeauConsentement), révocable à tout moment (pied de page) ;
// - rien n'est chargé si les identifiants ne sont pas configurés
//   (VITE_META_PIXEL_ID, VITE_TIKTOK_PIXEL_ID dans .env, publics par nature) ;
// - aucune donnée personnelle n'est transmise (ni email, ni téléphone, ni
//   identifiant de compte) : seulement le type d'événement.
// Web uniquement (navigateur) : jamais importé depuis src/partage.

type Choix = 'accepte' | 'refuse'

const CLE = 'keyli.consentement-suivi'
const VERSION = 1 // à augmenter si la liste des outils change : le bandeau réapparaît

const META_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() || ''
const TIKTOK_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID?.trim() || ''

// Événements suivis : conversions utiles à la publicité, rien d'autre
export type EvenementSuivi = 'inscription' | 'contact_annonceur' | 'publication_annonce' | 'recherche'

const META: Record<EvenementSuivi, string> = {
  inscription: 'CompleteRegistration',
  contact_annonceur: 'Contact',
  publication_annonce: 'SubmitApplication',
  recherche: 'Search',
}
const TIKTOK: Record<EvenementSuivi, string> = {
  inscription: 'CompleteRegistration',
  contact_annonceur: 'Contact',
  publication_annonce: 'SubmitForm',
  recherche: 'Search',
}

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: unknown
  queue?: unknown[]
  loaded?: boolean
  version?: string
  push?: unknown
}
type Ttq = { page: () => void; track: (evenement: string) => void } & Record<string, unknown>
declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
    ttq?: Ttq
    TiktokAnalyticsObject?: string
  }
}

export function suiviConfigure(): boolean {
  return META_ID !== '' || TIKTOK_ID !== ''
}

// Noms des outils réellement configurés, pour le bandeau : on ne cite
// jamais un outil qui ne sera pas chargé
export function nomsOutils(): string {
  const noms = [META_ID && 'Meta (Facebook, Instagram)', TIKTOK_ID && 'TikTok'].filter(Boolean)
  return noms.join(' et de ')
}

export function lireConsentement(): Choix | null {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) return null
    const v = JSON.parse(brut) as { choix?: Choix; version?: number }
    return v.version === VERSION && (v.choix === 'accepte' || v.choix === 'refuse') ? v.choix : null
  } catch {
    return null
  }
}

export function enregistrerConsentement(choix: Choix) {
  try {
    localStorage.setItem(CLE, JSON.stringify({ choix, version: VERSION, le: new Date().toISOString() }))
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la visite
  }
  if (choix === 'accepte') chargerOutils()
  else if (outilsCharges) {
    // Retrait du consentement : on recharge la page pour décharger les outils
    window.location.reload()
  }
}

// Réouvre le bandeau (lien « Cookies publicitaires » du pied de page)
export function retirerChoix() {
  try {
    localStorage.removeItem(CLE)
  } catch {
    // rien à faire
  }
  window.dispatchEvent(new Event('keyli:consentement'))
}

let outilsCharges = false

// Codes d'installation officiels de Meta et TikTok, chargés seulement après
// consentement (domaines autorisés dans public/_headers)
export function chargerOutils() {
  if (outilsCharges || !suiviConfigure() || lireConsentement() !== 'accepte') return
  outilsCharges = true

  if (META_ID) {
    const w = window
    if (!w.fbq) {
      const fbq: Fbq = function (...args: unknown[]) {
        // Reprise du code officiel de Meta : appels mis en file jusqu'au chargement
        if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args)
        else fbq.queue?.push(args)
      }
      fbq.push = fbq
      fbq.loaded = true
      fbq.version = '2.0'
      fbq.queue = []
      w.fbq = fbq
      w._fbq = fbq
      ajouterScript('https://connect.facebook.net/en_US/fbevents.js')
    }
    w.fbq('init', META_ID)
    w.fbq('track', 'PageView')
  }

  if (TIKTOK_ID) {
    const w = window
    w.TiktokAnalyticsObject = 'ttq'
    const ttq = (w.ttq = w.ttq || ([] as unknown as Ttq)) as Ttq & unknown[]
    const methodes = [
      'page',
      'track',
      'identify',
      'instances',
      'debug',
      'on',
      'off',
      'once',
      'ready',
      'alias',
      'group',
      'enableCookie',
      'disableCookie',
    ]
    for (const m of methodes) {
      ;(ttq as Record<string, unknown>)[m] = (...args: unknown[]) => {
        ;(ttq as unknown as unknown[]).push([m, ...args])
      }
    }
    ;(ttq as Record<string, unknown>)._i = { [TIKTOK_ID]: [] }
    ;(ttq as Record<string, unknown>)._t = { [TIKTOK_ID]: Date.now() }
    ajouterScript(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(TIKTOK_ID)}&lib=ttq`)
    ttq.page()
  }
}

function ajouterScript(src: string) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

// Changement de page dans l'application (pas de rechargement)
export function suivrePage() {
  if (!outilsCharges) return
  window.fbq?.('track', 'PageView')
  window.ttq?.page()
}

// Conversion : sans effet si les outils ne sont pas chargés
export function suivre(evenement: EvenementSuivi) {
  if (!outilsCharges) return
  window.fbq?.('track', META[evenement])
  window.ttq?.track(TIKTOK[evenement])
}
