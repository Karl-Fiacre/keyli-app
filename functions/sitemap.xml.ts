// Plan du site pour les moteurs de recherche (Sprint 7) : pages publiques et
// annonces publiées (non archivées, lisibles par un visiteur). Adresse
// calculée à partir du domaine appelé : reste juste après le passage à
// keyli.com.
import { echapper, lirePublic, PAGES_PUBLIQUES, type Contexte } from './_lib/keyli'

export async function onRequestGet(contexte: Contexte): Promise<Response> {
  const origine = new URL(contexte.request.url).origin
  const annonces =
    (await lirePublic<Array<{ id: string; updated_at: string | null; created_at: string }>>(
      'properties_keyli?archived_at=is.null&select=id,updated_at,created_at&order=created_at.desc&limit=5000',
    )) ?? []

  const url = (chemin: string, maj?: string | null) =>
    `<url><loc>${echapper(origine + chemin)}</loc>${maj ? `<lastmod>${maj.slice(0, 10)}</lastmod>` : ''}</url>`

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    PAGES_PUBLIQUES.map((p) => url(p)).join('\n') +
    '\n' +
    annonces.map((a) => url(`/annonce/${a.id}`, a.updated_at ?? a.created_at)).join('\n') +
    '\n</urlset>\n'

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
