// Révocation de « Se connecter avec Apple » à la suppression d'un compte
// (règle App Store 5.1.1(v)). L'app iPhone fournit un code à usage unique
// (authorizationCode, valable 5 minutes) ; on l'échange contre un jeton
// Apple, puis on révoque ce jeton : Keyli disparaît des « Apps utilisant
// l'identifiant Apple » de la personne.
//
// Secrets de la fonction (Supabase → Edge Functions → Secrets), jamais dans
// le code : APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (contenu du
// fichier .p8 de la clé « Sign in with Apple »). Absents : étape sautée et
// journalisée, la suppression du compte continue.

const APPLE = 'https://appleid.apple.com'
// Identifiant de l'app iPhone : c'est lui qui a émis le code (connexion native)
const CLIENT_ID = 'com.keyli.app'

const base64url = (octets: Uint8Array) =>
  btoa(String.fromCharCode(...octets)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const texteBase64url = (texte: string) => base64url(new TextEncoder().encode(texte))

// Secret client Apple : JWT ES256 signé avec la clé .p8, valable 5 minutes
async function secretClient(equipe: string, idCle: string, pem: string): Promise<string> {
  const corps = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
  const der = Uint8Array.from(atob(corps), (c) => c.charCodeAt(0))
  const cle = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const maintenant = Math.floor(Date.now() / 1000)
  const entete = texteBase64url(JSON.stringify({ alg: 'ES256', kid: idCle, typ: 'JWT' }))
  const contenu = texteBase64url(
    JSON.stringify({ iss: equipe, iat: maintenant, exp: maintenant + 300, aud: APPLE, sub: CLIENT_ID }),
  )
  // Web Crypto signe directement au format attendu par les JWT (r || s)
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cle, new TextEncoder().encode(`${entete}.${contenu}`)),
  )
  return `${entete}.${contenu}.${base64url(signature)}`
}

async function appelApple(chemin: string, parametres: Record<string, string>) {
  const reponse = await fetch(`${APPLE}${chemin}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(parametres),
  })
  const corps = await reponse.json().catch(() => ({}))
  return { ok: reponse.ok, corps: corps as Record<string, string> }
}

// Ne lève jamais : un échec est journalisé, la suppression continue
export async function revoquerApple(code: string, id: string): Promise<void> {
  const equipe = Deno.env.get('APPLE_TEAM_ID')?.trim()
  const idCle = Deno.env.get('APPLE_KEY_ID')?.trim()
  const pem = Deno.env.get('APPLE_PRIVATE_KEY')?.trim()
  if (!equipe || !idCle || !pem) {
    console.error('Révocation Apple sautée : secrets APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY manquants', id)
    return
  }
  try {
    const secret = await secretClient(equipe, idCle, pem)
    const jetons = await appelApple('/auth/token', {
      client_id: CLIENT_ID,
      client_secret: secret,
      code,
      grant_type: 'authorization_code',
    })
    const jeton = jetons.corps.refresh_token ?? jetons.corps.access_token
    if (!jetons.ok || !jeton) {
      console.error('Révocation Apple : échange du code refusé', id, jetons.corps.error ?? '')
      return
    }
    const revocation = await appelApple('/auth/revoke', {
      client_id: CLIENT_ID,
      client_secret: secret,
      token: jeton,
      token_type_hint: jetons.corps.refresh_token ? 'refresh_token' : 'access_token',
    })
    if (!revocation.ok) console.error('Révocation Apple refusée', id, revocation.corps.error ?? '')
  } catch (e) {
    console.error('Révocation Apple impossible', id, e)
  }
}
