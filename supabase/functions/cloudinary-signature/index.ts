// cloudinary-signature — autorise l'envoi direct de photos d'annonce du
// navigateur vers Cloudinary, sans jamais exposer le secret d'API.
// docs/MODULES/photos.md. JWT exigé (verify_jwt) ; réservé aux comptes
// propriétaire et agence actifs.
//
// Pour chaque photo, la fonction impose l'identifiant
// keyli/annonces/<compte>/<uuid> et signe aussi les formats acceptés et le
// redimensionnement à l'arrivée : le navigateur ne peut rien changer sans
// casser la signature. La base n'accepte ensuite que les adresses de ce
// dossier (url_photo_keyli_valide).
//
// Secrets d'Edge Function : CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
// CLOUDINARY_API_SECRET.
import { clientUtilisateur, enTetesCors, json } from '../_shared/commun.ts'

const FORMATS = 'jpg,jpeg,png,webp'
// Côté le plus long limité à 2000 px à l'arrivée (taille et coût de stockage)
const TRANSFORMATION = 'c_limit,h_2000,w_2000'
const MAX_PAR_DEMANDE = 10

async function sha1Hex(texte: string): Promise<string> {
  const empreinte = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(texte))
  return [...new Uint8Array(empreinte)].map((o) => o.toString(16).padStart(2, '0')).join('')
}

// Signature Cloudinary : paramètres triés « cle=valeur » joints par « & »,
// suivis du secret, hachés en SHA-1
async function signer(parametres: Record<string, string>, secret: string): Promise<string> {
  const chaine = Object.keys(parametres)
    .sort()
    .map((cle) => `${cle}=${parametres[cle]}`)
    .join('&')
  return sha1Hex(chaine + secret)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)

  const autorisation = req.headers.get('Authorization')
  if (!autorisation) return json({ erreur: 'Connexion requise' }, 401)

  const cloud = Deno.env.get('CLOUDINARY_CLOUD_NAME')?.trim()
  const cleApi = Deno.env.get('CLOUDINARY_API_KEY')?.trim()
  const secret = Deno.env.get('CLOUDINARY_API_SECRET')?.trim()
  if (!cloud || !cleApi || !secret) {
    console.error(
      'Cloudinary non configuré : CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ou CLOUDINARY_API_SECRET manquant',
    )
    return json({ erreur: 'Envoi de photos indisponible pour le moment' }, 503)
  }

  let nombre = 1
  try {
    const corps = await req.json()
    nombre = Number(corps?.nombre ?? 1)
  } catch {
    // corps vide : une seule photo
  }
  if (!Number.isInteger(nombre) || nombre < 1 || nombre > MAX_PAR_DEMANDE) {
    return json({ erreur: `Entre 1 et ${MAX_PAR_DEMANDE} photos par demande` }, 400)
  }

  // Qui appelle ? Le profil se lit avec le jeton de l'utilisateur (RLS)
  const client = clientUtilisateur(autorisation)
  const { data: utilisateur, error: errUtilisateur } = await client.auth.getUser()
  if (errUtilisateur || !utilisateur.user) return json({ erreur: 'Connexion requise' }, 401)
  const uid = utilisateur.user.id

  const { data: profil } = await client.from('profiles_keyli').select('role_keyli').eq('user_id', uid).single()
  if (profil?.role_keyli !== 'owner' && profil?.role_keyli !== 'agency') {
    return json({ erreur: 'Envoi de photos réservé aux propriétaires et aux agences' }, 403)
  }
  const { data: actif } = await client.rpc('compte_actif_keyli', { p_user: uid })
  if (actif !== true) return json({ erreur: 'Compte suspendu' }, 403)

  const timestamp = String(Math.floor(Date.now() / 1000))
  const envois = await Promise.all(
    Array.from({ length: nombre }, async () => {
      const parametres = {
        public_id: `keyli/annonces/${uid}/${crypto.randomUUID()}`,
        allowed_formats: FORMATS,
        transformation: TRANSFORMATION,
        timestamp,
      }
      return { ...parametres, signature: await signer(parametres, secret) }
    }),
  )

  return json({
    url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    api_key: cleApi,
    envois,
  })
})
