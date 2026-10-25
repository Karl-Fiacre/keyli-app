// handle-paystack-payment — démarre le paiement d'un forfait.
// 1. initier_paiement_keyli (au nom de l'utilisateur) vérifie qu'il peut
//    souscrire ce forfait, fige le montant et crée la tentative ;
// 2. initialisation de la transaction Paystack (montant XOF × 100, exigence
//    Paystack même sans sous-unité) ;
// 3. renvoie l'URL de paiement Paystack. Aucun abonnement n'est créé ici :
//    seule la confirmation du paiement (webhook ou vérification) l'active.
import { appelPaystack, clientServeur, clientUtilisateur, enTetesCors, json, statutErreurSql } from '../_shared/commun.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)

  const autorisation = req.headers.get('Authorization')
  if (!autorisation) return json({ erreur: 'Connexion requise' }, 401)

  let planId: unknown
  try {
    planId = (await req.json())?.plan_id
  } catch {
    return json({ erreur: 'Corps de requête invalide' }, 400)
  }
  if (typeof planId !== 'string' || !/^[0-9a-f-]{36}$/i.test(planId)) {
    return json({ erreur: 'Forfait invalide' }, 400)
  }

  const client = clientUtilisateur(autorisation)
  const { data: tentative, error } = await client.rpc('initier_paiement_keyli', { p_plan: planId }).single()
  if (error || !tentative) {
    return json({ erreur: error?.message ?? 'Paiement impossible' }, statutErreurSql(error?.code))
  }
  const t = tentative as { reference: string; montant: number; devise: string; email: string; plan_code: string }

  // Adresse de retour : doit être une URL http(s) — garde-fou contre un
  // secret mal placé qui partirait dans callback_url
  const urlApp = (Deno.env.get('KEYLI_APP_URL') ?? 'http://127.0.0.1:5173').trim().replace(/\/+$/, '')
  if (!/^https?:\/\/[^\s]+$/i.test(urlApp)) {
    await clientServeur().rpc('echec_paiement_keyli', {
      p_reference: t.reference,
      p_message: 'KEYLI_APP_URL mal configurée : une URL http(s) est attendue',
    })
    return json({ erreur: 'Le service de paiement est indisponible. Réessayez dans un instant.' }, 502)
  }
  const { ok, corps } = await appelPaystack('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: t.email,
      amount: String(Math.round(Number(t.montant) * 100)),
      currency: t.devise,
      reference: t.reference,
      callback_url: `${urlApp}/abonnement/retour`,
      metadata: JSON.stringify({ plan_code: t.plan_code }),
    }),
  })

  if (!ok) {
    await clientServeur().rpc('echec_paiement_keyli', {
      p_reference: t.reference,
      p_message: `Initialisation Paystack refusée : ${corps?.message ?? 'réponse invalide'}`,
    })
    return json({ erreur: 'Le service de paiement est indisponible. Réessayez dans un instant.' }, 502)
  }

  return json({ authorization_url: corps.data.authorization_url, reference: t.reference })
})
