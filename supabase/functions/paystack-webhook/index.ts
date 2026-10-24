// paystack-webhook — reçoit les événements Paystack.
// Signature obligatoire : en-tête x-paystack-signature = HMAC SHA512 du corps
// brut avec la clé secrète (documentation Paystack). Sans signature valide,
// rien n'est traité. Appelée par Paystack, sans jeton Supabase : déployée
// avec --no-verify-jwt (voir supabase/config.toml).
import { clientServeur, json, variable } from '../_shared/commun.ts'

const encodeur = new TextEncoder()

async function signatureAttendue(corps: string): Promise<string> {
  const cle = await crypto.subtle.importKey(
    'raw',
    encodeur.encode(variable('PAYSTACK_SECRET_KEY')),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cle, encodeur.encode(corps))
  return Array.from(new Uint8Array(signature), (o) => o.toString(16).padStart(2, '0')).join('')
}

// Comparaison à temps constant (pas de fuite par la durée de comparaison)
function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)

  const corps = await req.text()
  const recue = req.headers.get('x-paystack-signature') ?? ''
  if (!recue || !egal(recue, await signatureAttendue(corps))) {
    return json({ erreur: 'Signature invalide' }, 401)
  }

  const evenement = JSON.parse(corps) as {
    event: string
    data: { reference: string; amount: number; currency: string; id: number; status: string }
  }
  if (evenement.event !== 'charge.success') return json({ recu: true })

  const serveur = clientServeur()
  const d = evenement.data
  const { error } = await serveur.rpc('confirmer_paiement_keyli', {
    p_reference: d.reference,
    p_montant_subunit: d.amount,
    p_devise: d.currency,
    p_paystack_id: String(d.id),
  })

  if (error) {
    // Incohérence métier (montant, devise, référence inconnue) : enregistrée,
    // pas de nouvel essai. Erreur technique : 500 pour que Paystack réessaie.
    if (error.code === '23514' || error.code === 'P0002') {
      await serveur.rpc('echec_paiement_keyli', { p_reference: d.reference, p_message: error.message })
      return json({ recu: true, traite: false })
    }
    return json({ erreur: 'Traitement momentanément impossible' }, 500)
  }
  return json({ recu: true, traite: true })
})
