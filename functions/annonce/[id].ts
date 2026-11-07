// Aperçu propre à chaque annonce (Sprint 7) : quand un lien /annonce/… est
// partagé sur WhatsApp, Facebook ou lu par Google, la page renvoyée porte
// déjà le titre, le prix, le quartier et la photo de l'annonce (balises
// Open Graph). Le site React s'affiche ensuite normalement. Annonce absente,
// archivée ou base injoignable : la page générique est servie telle quelle.
import { echapper, LIBELLES_TYPE, lirePublic, urlApercu, type Contexte } from '../_lib/keyli'

interface Annonce {
  id: string
  title: string
  type: string
  status: string
  price: number
  sejour_court: boolean
  city: string | null
  main_image_url: string | null
  quartiers_keyli: { nom: string; communes_keyli: { nom: string } | null } | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function onRequestGet(contexte: Contexte): Promise<Response> {
  const page = await contexte.next()
  const id = String(contexte.params.id ?? '')
  if (!UUID.test(id) || !(page.headers.get('content-type') ?? '').includes('text/html')) return page

  const lignes = await lirePublic<Annonce[]>(
    `properties_keyli?id=eq.${id}&archived_at=is.null&select=id,title,type,status,price,sejour_court,city,main_image_url,quartiers_keyli(nom,communes_keyli(nom))`,
  )
  const a = lignes?.[0]
  if (!a) return page

  const lieu = [a.quartiers_keyli?.nom, a.quartiers_keyli?.communes_keyli?.nom, a.city]
    .filter((v, i, t): v is string => !!v && t.indexOf(v) === i)
    .join(', ')
  const prix = `${new Intl.NumberFormat('fr-FR').format(Number(a.price)).replace(/\s/g, ' ')} FCFA`
  const periode = a.status === 'a_louer' ? (a.sejour_court ? ' / nuit' : ' / mois') : ''
  const nature = a.sejour_court ? 'Séjour court' : a.status === 'a_louer' ? 'À louer' : 'À vendre'
  const titre = `${a.title} — ${prix}${periode} | Keyli`
  const description = `${nature} · ${LIBELLES_TYPE[a.type] ?? 'Bien'} · ${lieu}. Annonce sur Keyli, l’immobilier de confiance à Abidjan.`
  const image = urlApercu(a.main_image_url)
  const url = new URL(contexte.request.url)
  const canonique = `${url.origin}/annonce/${a.id}`

  const remplacer = (attribut: 'name' | 'property', cle: string, valeur: string) => ({
    element(el: Element) {
      if (el.getAttribute(attribut) === cle) el.setAttribute('content', valeur)
    },
  })

  const reecrit = new HTMLRewriter()
    .on('title', {
      element(el: Element) {
        el.setInnerContent(titre)
      },
    })
    .on('meta[name="description"]', remplacer('name', 'description', description))
    .on('meta[property="og:title"]', remplacer('property', 'og:title', titre))
    .on('meta[property="og:description"]', remplacer('property', 'og:description', description))
    .on('head', {
      element(el: Element) {
        // Balises propres à l'annonce (échappées : le titre vient de l'annonceur)
        el.append(
          `<link rel="canonical" href="${echapper(canonique)}">` +
            `<meta property="og:url" content="${echapper(canonique)}">` +
            (image
              ? `<meta property="og:image" content="${echapper(image)}">` +
                `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">` +
                `<meta name="twitter:image" content="${echapper(image)}">`
              : ''),
          { html: true },
        )
      },
    })
    // L'image générique (logo) d'index.html est retirée quand l'annonce a une
    // photo (les balises ajoutées ci-dessus ne passent pas par ces filtres)
    .on('meta[property="og:image"]', {
      element(el: Element) {
        if (image) el.remove()
      },
    })
    .on('meta[name="twitter:card"]', remplacer('name', 'twitter:card', image ? 'summary_large_image' : 'summary'))
    .transform(page)

  const reponse = new Response(reecrit.body, reecrit)
  // Court : prix ou photo peuvent changer
  reponse.headers.set('Cache-Control', 'public, max-age=300')
  return reponse
}
