// supprimer-compte — suppression du compte par son titulaire (web et
// mobile). Exigence Google Play et App Store : docs/MODULES/conformite.md.
// JWT exigé (verify_jwt) ; l'identité vient du jeton, jamais du corps.
//
// Étapes :
//   1. confirmation explicite (« SUPPRIMER ») ;
//   2. supprimer_compte_keyli (SQL, service_role) : séjours annulés,
//      annonces retirées, données personnelles effacées, profil anonymisé
//      et suspendu, entrée d'audit ;
//   3. fichiers de vérification effacés du stockage (documents_keyli/<id>/) ;
//   4. compte de connexion anonymisé et banni (email remplacé, mot de passe
//      aléatoire, métadonnées vidées) : plus aucune connexion possible.
// Les paiements sont conservés (obligation comptable).
import { clientServeur, clientUtilisateur, enTetesCors, json, statutErreurSql } from '../_shared/commun.ts'

const BUCKET = 'documents_keyli'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)

  const autorisation = req.headers.get('Authorization')
  if (!autorisation) return json({ erreur: 'Connexion requise' }, 401)

  let confirmation = ''
  try {
    confirmation = String((await req.json())?.confirmation ?? '')
  } catch {
    // corps vide : refusé ci-dessous
  }
  if (confirmation.trim().toUpperCase() !== 'SUPPRIMER') {
    return json({ erreur: 'Tapez SUPPRIMER pour confirmer la suppression du compte' }, 400)
  }

  const { data: utilisateur, error: erreurJeton } = await clientUtilisateur(autorisation).auth.getUser()
  if (erreurJeton || !utilisateur?.user) return json({ erreur: 'Session expirée, reconnectez-vous' }, 401)
  const id = utilisateur.user.id

  const serveur = clientServeur()

  const { error: erreurSql } = await serveur.rpc('supprimer_compte_keyli', { p_user: id })
  if (erreurSql) {
    console.error('supprimer_compte_keyli', erreurSql.code, erreurSql.message)
    return json({ erreur: erreurSql.message }, statutErreurSql(erreurSql.code))
  }

  // Fichiers de vérification : tout le dossier du compte (pagination par 100)
  try {
    for (;;) {
      const { data: fichiers, error } = await serveur.storage.from(BUCKET).list(id, { limit: 100 })
      if (error) throw error
      if (!fichiers?.length) break
      const { error: erreurSuppr } = await serveur.storage
        .from(BUCKET)
        .remove(fichiers.map((f) => `${id}/${f.name}`))
      if (erreurSuppr) throw erreurSuppr
      if (fichiers.length < 100) break
    }
  } catch (e) {
    // Le compte est déjà anonymisé : on journalise et on continue
    console.error('Effacement des documents incomplet', id, e)
  }

  // a) Connexion fermée pour toujours : bannissement SEUL. Étape décisive,
  //    isolée pour qu'aucun autre refus (règles de mot de passe du projet,
  //    email) ne laisse le compte utilisable.
  const { error: erreurBan } = await serveur.auth.admin.updateUserById(id, {
    ban_duration: '876000h', // ~100 ans
  })
  if (erreurBan) {
    console.error('Bannissement du compte de connexion', id, erreurBan.message)
    return json({ erreur: 'Compte vidé, mais la fermeture de la connexion a échoué. Contactez Keyli.' }, 500)
  }

  // b) Anonymisation (données personnelles) : mot de passe aléatoire
  //    contenant tous les types de caractères (règles de complexité du
  //    projet), métadonnées vidées, email remplacé. Un échec est journalisé
  //    pour reprise manuelle, le compte étant déjà banni.
  const motDePasse = `Kx9!${crypto.randomUUID()}${crypto.randomUUID()}`
  const { error: erreurAnonyme } = await serveur.auth.admin.updateUserById(id, {
    password: motDePasse,
    user_metadata: {},
  })
  if (erreurAnonyme) console.error('Anonymisation du compte de connexion', id, erreurAnonyme.message)
  const { error: erreurEmail } = await serveur.auth.admin.updateUserById(id, {
    email: `supprime-${id}@keyli.invalid`,
    email_confirm: true,
  })
  if (erreurEmail) console.error('Anonymisation de l\'email', id, erreurEmail.message)

  // c) Toutes les sessions du compte révoquées (tous les appareils) : sans
  //    cela, un autre téléphone resterait connecté jusqu'à l'expiration du jeton
  const jeton = autorisation.replace(/^Bearer\s+/i, '')
  const { error: erreurSessions } = await serveur.auth.admin.signOut(jeton, 'global')
  if (erreurSessions) console.error('Révocation des sessions', id, erreurSessions.message)

  return json({ supprime: true })
})
