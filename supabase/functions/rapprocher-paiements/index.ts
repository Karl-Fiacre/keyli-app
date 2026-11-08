// rapprocher-paiements — rattrapage des paiements restés en attente
// (Sprint 9, docs/MODULES/paiements.md). Réveillée toutes les 15 minutes par
// la tâche planifiée keyli-rapprochement-paiements (pg_cron + pg_net) quand
// des paiements sont à vérifier.
// * Sans corps : lot choisi par la base (prendre_paiements_a_verifier_keyli),
//   au plus une vérification par paiement et par heure. Un appel extérieur
//   ne peut donc que vérifier plus tôt un paiement déjà en attente.
// * { reference } : vérification immédiate d'un paiement, réservée aux
//   admins (bouton « Vérifier » de l'onglet admin Paiements).
// Pour chaque paiement, Paystack est interrogé (/transaction/verify) :
// réussi → confirmation idempotente (comme le webhook) ; refusé → échec
// notifié avec le motif ; sans issue → « abandoned » après 24 h.
import { appelPaystack, clientServeur, clientUtilisateur, enTetesCors, json } from '../_shared/commun.ts'

type Bilan = 'confirme' | 'refuse' | 'abandonne' | 'en_attente' | 'erreur'

type Serveur = ReturnType<typeof clientServeur>

async function verifier(serveur: Serveur, reference: string): Promise<Bilan> {
  const { ok, corps } = await appelPaystack(`/transaction/verify/${encodeURIComponent(reference)}`)
  if (!ok) {
    // Référence jamais initialisée chez Paystack : abandon après 24 h ;
    // autre erreur (réseau, clé) : nouvel essai au prochain passage
    if (/not found/i.test(String(corps?.message ?? ''))) {
      const { data } = await serveur.rpc('abandonner_paiement_keyli', { p_reference: reference })
      return data ? 'abandonne' : 'en_attente'
    }
    return 'erreur'
  }

  const d = corps.data as { status: string; amount: number; currency: string; id: number; gateway_response?: string }
  if (d.status === 'success') {
    const { error } = await serveur.rpc('confirmer_paiement_keyli', {
      p_reference: reference,
      p_montant_subunit: d.amount,
      p_devise: d.currency,
      p_paystack_id: String(d.id),
    })
    if (!error) return 'confirme'
    // Incohérence métier (montant, devise) : échec enregistré et notifié
    if (error.code === '23514' || error.code === 'P0002') {
      await serveur.rpc('echec_paiement_keyli', { p_reference: reference, p_message: error.message, p_notifier: true })
      return 'refuse'
    }
    return 'erreur'
  }
  if (d.status === 'failed' || d.status === 'reversed') {
    await serveur.rpc('echec_paiement_keyli', {
      p_reference: reference,
      p_message: `Paiement ${d.status} (rattrapage)${d.gateway_response ? ` : ${d.gateway_response}` : ''}`,
      p_motif_refus: d.gateway_response ?? null,
      p_notifier: true,
    })
    return 'refuse'
  }
  // abandoned, ongoing, pending, processing, queued : encore possible
  const { data } = await serveur.rpc('abandonner_paiement_keyli', { p_reference: reference })
  return data ? 'abandonne' : 'en_attente'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)

  let reference: unknown = null
  try {
    reference = (await req.json().catch(() => ({})))?.reference ?? null
  } catch {
    reference = null
  }

  const serveur = clientServeur()

  if (reference !== null) {
    if (typeof reference !== 'string' || !/^[A-Za-z0-9.=-]{1,100}$/.test(reference)) {
      return json({ erreur: 'Référence invalide' }, 400)
    }
    // Vérification à la demande : admin uniquement (contrôle fait par la base)
    const autorisation = req.headers.get('Authorization')
    if (!autorisation) return json({ erreur: 'Connexion requise' }, 401)
    const { data: estAdmin } = await clientUtilisateur(autorisation).rpc('est_admin_keyli')
    if (estAdmin !== true) return json({ erreur: 'Action réservée aux administrateurs' }, 403)
  }

  const { data: lot, error } = await serveur.rpc('prendre_paiements_a_verifier_keyli', {
    p_limite: 20,
    p_reference: reference,
  })
  if (error) return json({ erreur: 'Traitement momentanément impossible' }, 500)
  if (reference !== null && (!lot || lot.length === 0)) {
    return json({ erreur: 'Ce paiement n’est plus en attente' }, 409)
  }

  const bilan: Record<Bilan, number> = { confirme: 0, refuse: 0, abandonne: 0, en_attente: 0, erreur: 0 }
  for (const p of (lot ?? []) as { reference: string }[]) {
    bilan[await verifier(serveur, p.reference)] += 1
  }
  return json({ verifies: (lot ?? []).length, ...bilan })
})
