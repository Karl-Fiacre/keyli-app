// get-mapbox-token — sert le jeton PUBLIC Mapbox (pk.…) au client, pour ne
// pas l'écrire en dur dans le code (docs/MODULES/annonces.md). Le jeton est
// le secret d'Edge Function MAPBOX_PUBLIC_TOKEN ; une clé secrète Mapbox
// (sk.…) n'est jamais renvoyée, même mal configurée.
import { enTetesCors, json } from '../_shared/commun.ts'

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })
  if (req.method !== 'POST' && req.method !== 'GET') return json({ erreur: 'Méthode non autorisée' }, 405)

  const jeton = Deno.env.get('MAPBOX_PUBLIC_TOKEN')?.trim()
  if (!jeton) return json({ erreur: 'Carte non configurée' }, 503)
  if (!jeton.startsWith('pk.')) {
    console.error('MAPBOX_PUBLIC_TOKEN mal configuré : un jeton public pk.… est attendu')
    return json({ erreur: 'Carte non configurée' }, 503)
  }

  return new Response(JSON.stringify({ jeton }), {
    headers: { ...enTetesCors, 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=3600' },
  })
})
