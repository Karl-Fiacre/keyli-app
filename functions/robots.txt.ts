// Consignes aux moteurs de recherche (Sprint 7) : pages publiques ouvertes,
// espaces privés exclus, plan du site sur le domaine appelé. Les adresses
// de prévisualisation Cloudflare (xxxx.keyli-2gc.pages.dev) ne sont pas
// indexées, pour éviter les doublons du site principal.
import { PAGES_PRIVEES, type Contexte } from './_lib/keyli'

export function onRequestGet(contexte: Contexte): Response {
  const url = new URL(contexte.request.url)
  const previsualisation = /^[0-9a-f]{8}\.[a-z0-9-]+\.pages\.dev$/.test(url.hostname)
  const texte = previsualisation
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\n' +
      PAGES_PRIVEES.map((p) => `Disallow: ${p}`).join('\n') +
      `\n\nSitemap: ${url.origin}/sitemap.xml\n`
  return new Response(texte, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
