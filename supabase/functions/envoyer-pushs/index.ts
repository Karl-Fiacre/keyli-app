// envoyer-pushs — vide la file des notifications push
// (pushs_sortants_keyli, docs/MODULES/mobile.md, Sprint 17). Réveillée
// chaque minute par la tâche keyli-envoi-pushs (pg_cron + pg_net) quand des
// push sont dus. Un appel extérieur ne peut qu'avancer un envoi déjà prévu :
// la file, le texte et les jetons viennent de la base.
//
// Envoi DIRECT (choix du porteur du 2026-11-11) :
// * iPhone : Apple APNs, jeton signé ES256 avec la clé .p8 — secrets
//   APNS_KEY_ID, APNS_TEAM_ID, APNS_CLE_PRIVEE (contenu du .p8),
//   APNS_BUNDLE_ID (défaut com.keyli.app) ;
// * Android : Google FCM HTTP v1, jeton OAuth signé RS256 avec le compte de
//   service Firebase — secret FCM_COMPTE_SERVICE (JSON complet, ou encodé
//   en base64).
// Secrets posés par le porteur ; une plateforme non configurée est
// signalée comme échec (nouvel essai), sans bloquer l'autre.
import { clientServeur, json, variable } from '../_shared/commun.ts'

interface Appareil {
  jeton: string
  plateforme: 'ios' | 'android'
  environnement: 'production' | 'sandbox'
}

interface PushDu {
  id: string
  categorie: 'notification' | 'message'
  type: string | null
  titre: string | null
  contenu: string | null
  property_id: string | null
  expediteur_id: string | null
  expediteur: string | null
  extrait: string | null
  non_lus: number | null
  appareils: Appareil[]
}

interface Contenu {
  titre: string
  texte: string
  // Données lues par l'application pour ouvrir le bon écran
  donnees: Record<string, string>
}

const LOT = 50

// « de Koffi » / « d’Aminata »
function de(nom: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûü]/i.test(nom) ? `d’${nom}` : `de ${nom}`
}

function composer(p: PushDu): Contenu {
  if (p.categorie === 'message') {
    const qui = p.expediteur ?? 'Un utilisateur'
    const n = p.non_lus ?? 1
    return {
      titre: n > 1 ? `${n} nouveaux messages ${de(qui)}` : `Nouveau message ${de(qui)}`,
      texte: p.extrait ?? `${qui} vous a écrit sur Keyli.`,
      donnees: {
        categorie: 'message',
        property_id: p.property_id ?? '',
        expediteur_id: p.expediteur_id ?? '',
      },
    }
  }
  return {
    titre: p.titre ?? 'Keyli',
    texte: p.contenu ?? 'Nouvelle notification',
    donnees: { categorie: 'notification', type: p.type ?? '', property_id: p.property_id ?? '' },
  }
}

// ---------- Outils de signature ----------
function base64url(octets: ArrayBuffer | Uint8Array | string): string {
  const tableau =
    typeof octets === 'string' ? new TextEncoder().encode(octets) : new Uint8Array(octets as ArrayBuffer)
  let binaire = ''
  for (const o of tableau) binaire += String.fromCharCode(o)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Clé PKCS#8 au format PEM (.p8 Apple, private_key Google) → octets
function pem(cle: string): ArrayBuffer {
  const corps = cle
    .replace(/\\n/g, '\n')
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s+/g, '')
  const binaire = atob(corps)
  const octets = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i)
  return octets.buffer
}

async function jwt(entete: object, charge: object, cle: CryptoKey, algo: AlgorithmIdentifier | EcdsaParams) {
  const aSigner = `${base64url(JSON.stringify(entete))}.${base64url(JSON.stringify(charge))}`
  // ES256 : WebCrypto rend directement r||s, le format attendu par un JWT
  const signature = await crypto.subtle.sign(algo, cle, new TextEncoder().encode(aSigner))
  return `${aSigner}.${base64url(signature)}`
}

// ---------- Apple APNs ----------
let jetonApns: { valeur: string; expire: number } | null = null

async function autorisationApns(): Promise<string> {
  // Apple accepte un même jeton entre 20 et 60 minutes : renouvelé à 50 min
  if (jetonApns && jetonApns.expire > Date.now()) return jetonApns.valeur
  const cle = await crypto.subtle.importKey(
    'pkcs8',
    pem(variable('APNS_CLE_PRIVEE')),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const valeur = await jwt(
    { alg: 'ES256', kid: variable('APNS_KEY_ID') },
    { iss: variable('APNS_TEAM_ID'), iat: Math.floor(Date.now() / 1000) },
    cle,
    { name: 'ECDSA', hash: 'SHA-256' },
  )
  jetonApns = { valeur, expire: Date.now() + 50 * 60 * 1000 }
  return valeur
}

// Résultat : true envoyé, false échec passager, 'invalide' jeton à retirer
async function envoyerApns(a: Appareil, c: Contenu): Promise<true | false | 'invalide'> {
  const hote = a.environnement === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com'
  const r = await fetch(`https://${hote}/3/device/${a.jeton}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${await autorisationApns()}`,
      'apns-topic': Deno.env.get('APNS_BUNDLE_ID')?.trim() || 'com.keyli.app',
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: { alert: { title: c.titre, body: c.texte }, sound: 'default' },
      ...c.donnees,
    }),
  })
  if (r.ok) return true
  const corps = await r.json().catch(() => ({}))
  const raison = (corps as { reason?: string }).reason ?? ''
  if (r.status === 410 || raison === 'BadDeviceToken' || raison === 'Unregistered') return 'invalide'
  console.error(`APNs ${r.status} ${raison}`)
  return false
}

// ---------- Google FCM ----------
let jetonFcm: { valeur: string; projet: string; expire: number } | null = null

async function autorisationFcm(): Promise<{ valeur: string; projet: string }> {
  if (jetonFcm && jetonFcm.expire > Date.now()) return jetonFcm
  // JSON du compte de service, tel quel ou encodé en base64 (PowerShell 5
  // retire les guillemets d'un JSON passé en argument à npx)
  const brut = variable('FCM_COMPTE_SERVICE')
  const compte = JSON.parse(brut.startsWith('{') ? brut : new TextDecoder().decode(
    Uint8Array.from(atob(brut), (c) => c.charCodeAt(0)),
  )) as {
    client_email: string
    private_key: string
    project_id: string
  }
  const cle = await crypto.subtle.importKey(
    'pkcs8',
    pem(compte.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const maintenant = Math.floor(Date.now() / 1000)
  const assertion = await jwt(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: compte.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: maintenant,
      exp: maintenant + 3600,
    },
    cle,
    { name: 'RSASSA-PKCS1-v1_5' },
  )
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!r.ok) throw new Error(`OAuth Google ${r.status}`)
  const { access_token, expires_in } = (await r.json()) as { access_token: string; expires_in: number }
  jetonFcm = { valeur: access_token, projet: compte.project_id, expire: Date.now() + (expires_in - 300) * 1000 }
  return jetonFcm
}

async function envoyerFcm(a: Appareil, c: Contenu): Promise<true | false | 'invalide'> {
  const { valeur, projet } = await autorisationFcm()
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${projet}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${valeur}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: a.jeton,
        notification: { title: c.titre, body: c.texte },
        data: c.donnees,
        // Canal créé par l'application (services/native/notifications.ts)
        android: { priority: 'high', notification: { channel_id: 'keyli', sound: 'default' } },
      },
    }),
  })
  if (r.ok) return true
  const texte = await r.text()
  if (r.status === 404 || texte.includes('UNREGISTERED')) return 'invalide'
  console.error(`FCM ${r.status} ${texte.slice(0, 200)}`)
  return false
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)

  const serveur = clientServeur()
  const { data, error } = await serveur.rpc('prendre_pushs_keyli', { p_limite: LOT })
  if (error) {
    // Détail dans les journaux seulement, jamais dans la réponse
    console.error('prendre_pushs_keyli :', error.message)
    return json({ erreur: 'Traitement momentanément impossible' }, 500)
  }

  const lot = (data ?? []) as PushDu[]
  const invalides: string[] = []
  let envoyes = 0
  for (const p of lot) {
    const c = composer(p)
    let atteint = false
    let erreur = ''
    // Tous les téléphones du compte reçoivent la notification
    for (const a of p.appareils ?? []) {
      try {
        const r = a.plateforme === 'ios' ? await envoyerApns(a, c) : await envoyerFcm(a, c)
        if (r === true) atteint = true
        else if (r === 'invalide') invalides.push(a.jeton)
        else erreur = `Refus ${a.plateforme}`
      } catch (err) {
        // Secret absent ou mal formé : message sans valeur sensible
        erreur = (err as Error).message
      }
    }
    // Tous les jetons refusés : rien à retenter
    const seulementInvalides = !atteint && !erreur
    await serveur.rpc('terminer_push_keyli', {
      p_id: p.id,
      p_ok: atteint || seulementInvalides,
      p_erreur: atteint || seulementInvalides ? null : erreur,
    })
    if (atteint) envoyes++
  }
  if (invalides.length) await serveur.rpc('retirer_jetons_push_keyli', { p_jetons: invalides })
  return json({ pris: lot.length, envoyes, jetons_retires: invalides.length })
})
