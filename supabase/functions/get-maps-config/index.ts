// get-maps-config — sert la configuration PUBLIQUE de Google Maps au client
// (clé de navigateur + Map ID), pour ne pas l'écrire en dur dans le code.
// Décision du porteur (2026-10-31) : Google Maps remplace Mapbox.
// La clé est restreinte côté Google Cloud (référents HTTP des domaines Keyli,
// API « Maps JavaScript » seule) : c'est cette restriction qui la protège.
// Secrets d'Edge Function : GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID.
import { enTetesCors, json } from '../_shared/commun.ts'

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })
  if (req.method !== 'POST' && req.method !== 'GET') return json({ erreur: 'Méthode non autorisée' }, 405)

  const cle = Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim()
  const mapId = Deno.env.get('GOOGLE_MAPS_MAP_ID')?.trim()
  if (!cle || !mapId) return json({ erreur: 'Carte non configurée' }, 503)
  // Une clé d'API Google commence par « AIza » : tout autre format est une
  // erreur de configuration (on ne renvoie jamais une valeur inattendue)
  if (!cle.startsWith('AIza')) {
    console.error('GOOGLE_MAPS_API_KEY mal configurée : une clé « AIza… » est attendue')
    return json({ erreur: 'Carte non configurée' }, 503)
  }

  return new Response(JSON.stringify({ cle, mapId }), {
    headers: { ...enTetesCors, 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=3600' },
  })
})
