// verify-paystack-payment — appelée au retour de Paystack sur l'application
// (page /abonnement/retour), au cas où le webhook n'est pas encore arrivé.
// Vérifie la transaction directement auprès de Paystack, puis la confirme
// (même fonction idempotente que le webhook).
import { appelPaystack, clientServeur, clientUtilisateur, enTetesCors, json } from '../_shared/commun.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)

  const autorisation = req.headers.get('Authorization')
  if (!autorisation) return json({ erreur: 'Connexion requise' }, 401)

  let reference: unknown
  try {
    reference = (await req.json())?.reference
  } catch {
    return json({ erreur: 'Corps de requête invalide' }, 400)
  }
  if (typeof reference !== 'string' || !/^[A-Za-z0-9.=-]{1,100}$/.test(reference)) {
    return json({ erreur: 'Référence invalide' }, 400)
  }

  // La RLS ne laisse l'utilisateur lire que SES tentatives : une référence
  // appartenant à quelqu'un d'autre est simplement introuvable.
  const { data: tentative } = await clientUtilisateur(autorisation)
    .from('payment_attempts_keyli')
    .select('status')
    .eq('paystack_reference', reference)
    .maybeSingle()
  if (!tentative) return json({ erreur: 'Paiement introuvable' }, 404)
  if (tentative.status === 'success') return json({ statut: 'success' })
  if (tentative.status === 'failed') return json({ statut: 'failed' })

  const { ok, corps } = await appelPaystack(`/transaction/verify/${encodeURIComponent(reference)}`)
  if (!ok) return json({ statut: 'pending' })

  const d = corps.data as { status: string; amount: number; currency: string; id: number; gateway_response?: string }
  const serveur = clientServeur()
  if (d.status === 'success') {
    const { error } = await serveur.rpc('confirmer_paiement_keyli', {
      p_reference: reference,
      p_montant_subunit: d.amount,
      p_devise: d.currency,
      p_paystack_id: String(d.id),
    })
    if (error) {
      await serveur.rpc('echec_paiement_keyli', { p_reference: reference, p_message: error.message })
      return json({ statut: 'failed' })
    }
    return json({ statut: 'success' })
  }
  if (d.status === 'failed' || d.status === 'abandoned' || d.status === 'reversed') {
    await serveur.rpc('echec_paiement_keyli', {
      p_reference: reference,
      p_message: `Paiement ${d.status}${d.gateway_response ? ` : ${d.gateway_response}` : ''}`,
    })
    return json({ statut: 'failed' })
  }
  return json({ statut: 'pending' })
})
