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
  // trim : un espace ou un retour à la ligne collé avec le secret le rend invalide
  const valeur = Deno.env.get(nom)?.trim()
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`)
  return valeur
}

// Clé secrète Paystack, contrôlée sans jamais être révélée : le diagnostic
// n'indique que sa nature (clé publique, préfixe « Bearer », autre).
export function clePaystack(): string {
  const cle = variable('PAYSTACK_SECRET_KEY').replace(/^Bearer\s+/i, '')
  if (/^sk_(test|live)_\S+$/.test(cle)) return cle
  const nature = cle.startsWith('pk_')
    ? 'clé PUBLIQUE (pk_…) au lieu de la clé secrète (sk_…)'
    : /^https?:/i.test(cle)
      ? 'contient une URL (inversée avec KEYLI_APP_URL ?)'
      : /^["']/.test(cle)
        ? 'entourée de guillemets'
        : cle.includes('=')
          ? 'contient « = » (NOM=valeur collé au lieu de la seule valeur ?)'
          : /sk_(test|live)_/.test(cle)
            ? 'la clé sk_… est précédée ou suivie d’autres caractères'
            : `format inattendu (${cle.length} caractères), une clé sk_test_… est attendue`
  throw new Error(`PAYSTACK_SECRET_KEY mal configurée : ${nature}`)
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

export async function appelPaystack(
  chemin: string,
  init: RequestInit = {},
  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- réponse JSON Paystack non typée
): Promise<{ ok: boolean; corps: any }> {
  let cle: string
  try {
    cle = clePaystack()
  } catch (e) {
    // Clé mal configurée : remontée comme un refus, avec son diagnostic
    return { ok: false, corps: { message: (e as Error).message } }
  }
  const reponse = await fetch(`${API_PAYSTACK}${chemin}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cle}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const corps = await reponse.json().catch(() => ({}))
  return { ok: reponse.ok && corps?.status === true, corps }
}
