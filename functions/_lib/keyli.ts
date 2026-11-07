// Outils communs aux fonctions Cloudflare Pages (référencement, Sprint 7 —
// docs/MODULES/ouverture-grand-public.md). Lecture publique seulement :
// la clé est la clé publique (anon) du site, les règles d'accès (RLS) de la
// base s'appliquent comme pour un visiteur.
import { SUPABASE_CLE_PUBLIQUE, SUPABASE_URL } from '../_config.generated'

export interface Contexte {
  request: Request
  params: Record<string, string | string[]>
  next: () => Promise<Response>
}

// Lecture REST publique (PostgREST) ; null en cas d'échec : une fonction de
// référencement ne doit jamais casser l'affichage de la page
export async function lirePublic<T>(chemin: string): Promise<T | null> {
  try {
    const reponse = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
      headers: { apikey: SUPABASE_CLE_PUBLIQUE, Authorization: `Bearer ${SUPABASE_CLE_PUBLIQUE}` },
    })
    if (!reponse.ok) return null
    return (await reponse.json()) as T
  } catch {
    return null
  }
}

// Échappement pour un attribut ou un texte HTML / XML
export function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Copie de LIBELLES_TYPE (src/lib/validation.ts) : les fonctions sont
// compilées à part et n'importent pas le code du site
export const LIBELLES_TYPE: Record<string, string> = {
  appartement: 'Appartement',
  studio: 'Studio',
  maison: 'Maison',
  villa: 'Villa',
  duplex: 'Duplex',
  residence_meublee: 'Résidence meublée',
  bureau: 'Bureau',
  magasin: 'Magasin',
  auberge: 'Auberge',
  hotel: 'Hôtel',
}

// Même transformation que urlPhoto (src/lib/cloudinary.ts) : vignette
// 1200 × 630 recadrée, format adapté au réseau social
export function urlApercu(url: string | null): string | null {
  if (!url) return null
  if (!url.startsWith('https://res.cloudinary.com/') || !url.includes('/image/upload/')) return url
  return url.replace('/image/upload/', '/image/upload/f_jpg,q_auto,c_fill,g_auto,w_1200,h_630/')
}

// Pages publiques indexables (plan du site, robots.txt)
export const PAGES_PUBLIQUES = [
  '/',
  '/recherche',
  '/a-propos',
  '/partenaires',
  '/aide',
  '/conditions',
  '/confidentialite',
  '/mentions-legales',
]

// Espaces privés : jamais indexés
export const PAGES_PRIVEES = [
  '/admin',
  '/tableau-de-bord',
  '/profil',
  '/abonnement',
  '/annonces',
  '/messages',
  '/favoris',
  '/reservations',
  '/retours',
  '/desinscription',
  '/verifier-email',
  '/nouveau-mot-de-passe',
  '/dev',
]
