// Traduction en français des erreurs renvoyées par Supabase (Auth et base).
// Les messages techniques ne sont jamais affichés tels quels à l'utilisateur.

interface ErreurSupabase {
  message?: string
  code?: string
  status?: number
}

const MESSAGES_AUTH: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Email ou mot de passe incorrect.'],
  [/email not confirmed/i, 'Votre adresse email n\'est pas encore confirmée. Ouvrez le lien reçu par email.'],
  [/user already registered/i, 'Un compte existe déjà avec cette adresse email.'],
  [/password should be at least/i, 'Le mot de passe est trop court.'],
  [/rate limit|too many requests/i, 'Trop de tentatives. Patientez quelques minutes avant de réessayer.'],
  [/user is banned|banned/i, 'Ce compte est suspendu. Contactez le support Keyli.'],
  [/same password|different from the old password/i, 'Le nouveau mot de passe doit être différent de l\'ancien.'],
  [/nom de l'agence est obligatoire/i, 'Le nom de l\'agence est obligatoire pour inscrire une agence.'],
  [/database error saving new user/i, 'L\'inscription n\'a pas pu aboutir. Vérifiez les informations saisies.'],
  [/failed to fetch|network/i, 'Connexion impossible. Vérifiez votre accès à Internet.'],
]

// Codes SQLSTATE levés par nos règles en base (voir docs/DATABASE.md)
const MESSAGES_BASE: Record<string, string> = {
  '42501': 'Cette action ne vous est pas autorisée.',
  '23514': 'Les informations saisies ne respectent pas les règles de Keyli.',
  '23505': 'Cette information existe déjà.',
  // Publication d'annonce (trigger de forfait, docs/DATABASE.md)
  KY001: 'Un abonnement actif est nécessaire pour publier une annonce.',
  KY002: 'Votre forfait a atteint son nombre maximal d\'annonces.',
  KY003: 'Cette annonce dépasse votre forfait : confirmez le dépassement pour la publier.',
  KY004: 'Votre registre de commerce doit être approuvé avant de publier.',
}

export function messageErreur(erreur: unknown): string {
  const e = (erreur ?? {}) as ErreurSupabase
  const message = e.message ?? ''
  for (const [motif, traduction] of MESSAGES_AUTH) {
    if (motif.test(message)) return traduction
  }
  if (e.code && MESSAGES_BASE[e.code]) {
    // Les règles métier écrivent déjà leur message en français : le garder
    return /[éèàç]/.test(message) ? message : MESSAGES_BASE[e.code]
  }
  return 'Une erreur inattendue est survenue. Réessayez dans un instant.'
}
