// Utilitaires partagés des Edge Functions Keyli.
// Codes HTTP (docs/CONVENTIONS.md) : 400 validation, 401 non authentifié,
// 403 rôle non autorisé, 404 non trouvé, 409 conflit métier, 422 règle
// métier violée, 502 erreur du prestataire (Paystack).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const enTetesCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...enTetesCors, 'Content-Type': 'application/json' },
  })
}

export function variable(nom: string): string {
  const valeur = Deno.env.get(nom)
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`)
  return valeur
}

// Client agissant AU NOM de l'utilisateur (son jeton) : la RLS et les
// contrôles des fonctions SQL s'appliquent à lui.
export function clientUtilisateur(autorisation: string): SupabaseClient {
  return createClient(variable('SUPABASE_URL'), variable('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: autorisation } },
    auth: { persistSession: false },
  })
}

// Client serveur (clé service_role, jamais exposée au navigateur) : réservé
// aux fonctions SQL de confirmation / échec de paiement.
export function clientServeur(): SupabaseClient {
  return createClient(variable('SUPABASE_URL'), variable('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
}

// Code HTTP correspondant à une erreur levée par nos fonctions SQL
export function statutErreurSql(code?: string): number {
  if (code === '42501') return 403
  if (code === 'P0002') return 404
  if (code === '23505') return 409
  if (code === '23514' || code === '22023') return 422
  return 500
}

const API_PAYSTACK = 'https://api.paystack.co'

export async function appelPaystack(chemin: string, init: RequestInit = {}) {
  const reponse = await fetch(`${API_PAYSTACK}${chemin}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${variable('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const corps = await reponse.json().catch(() => ({}))
  return { ok: reponse.ok && corps?.status === true, corps }
}
