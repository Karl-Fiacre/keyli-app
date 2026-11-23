// Génère le « Secret Key (for OAuth) » Apple à coller dans Supabase
// (Authentication > Providers > Apple). À lancer sur l'ordinateur du porteur :
//
//   node scripts/generer-secret-apple.mjs <chemin du .p8> <Team ID> <Key ID> <Services ID>
//
// Le fichier .p8 n'est jamais copié ni envoyé : il est seulement lu pour
// signer. Le secret affiché expire au bout de 6 mois (maximum fixé par Apple) :
// relancer ce script avant la date affichée et recoller le nouveau secret.
import { createPrivateKey, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'

const [chemin, teamId, keyId, servicesId] = process.argv.slice(2)
if (!chemin || !teamId || !keyId || !servicesId) {
  console.error('Usage : node scripts/generer-secret-apple.mjs <fichier .p8> <Team ID> <Key ID> <Services ID>')
  process.exit(1)
}

const base64url = (donnees) => Buffer.from(donnees).toString('base64url')
const maintenant = Math.floor(Date.now() / 1000)
const expiration = maintenant + 180 * 24 * 3600 // 180 jours

const entete = base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }))
const contenu = base64url(
  JSON.stringify({
    iss: teamId,
    iat: maintenant,
    exp: expiration,
    aud: 'https://appleid.apple.com',
    sub: servicesId,
  }),
)
const cle = createPrivateKey(readFileSync(chemin, 'utf8'))
const signature = sign('sha256', Buffer.from(`${entete}.${contenu}`), { key: cle, dsaEncoding: 'ieee-p1363' })

console.log('\nSecret à coller dans Supabase (Secret Key for OAuth) :\n')
console.log(`${entete}.${contenu}.${base64url(signature)}`)
console.log(`\nExpire le ${new Date(expiration * 1000).toLocaleDateString('fr-FR')} : le regénérer avant cette date.\n`)
