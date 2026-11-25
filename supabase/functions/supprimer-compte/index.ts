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
//   4. compte ouvert avec Apple (code fourni par l'app iPhone) : accès révoqué
//      chez Apple (apple.ts), sans bloquer la suite ;
//   5. compte de connexion supprimé par Supabase (suppression douce : email
//      masqué, liens Google/Apple effacés, sessions fermées) ; repli sur un
//      bannissement si l'API refuse.
// Les paiements sont conservés (obligation comptable).
import { clientServeur, clientUtilisateur, enTetesCors, json, statutErreurSql } from '../_shared/commun.ts'
import { revoquerApple } from './apple.ts'

const BUCKET = 'documents_keyli'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors })
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405)

  const autorisation = req.headers.get('Authorization')
  if (!autorisation) return json({ erreur: 'Connexion requise' }, 401)

  let confirmation = ''
  let codeApple = ''
  try {
    const corps = await req.json()
    confirmation = String(corps?.confirmation ?? '')
    codeApple = typeof corps?.codeApple === 'string' ? corps.codeApple : ''
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

  // Compte ouvert avec Apple : accès de Keyli révoqué chez Apple (5.1.1(v)),
  // sans jamais bloquer la suppression
  if (codeApple) await revoquerApple(codeApple, id)

  // Compte de connexion supprimé par Supabase (suppression « douce ») : la
  // ligne auth.users reste (paiements conservés) mais email masqué, liens
  // Google / Apple / Facebook effacés et toutes les sessions fermées. La
  // même adresse ou le même identifiant Apple peut donc créer plus tard un
  // NOUVEAU compte — un simple bannissement les bloquait pour toujours.
  const { error: erreurAuth } = await serveur.auth.admin.deleteUser(id, true)
  if (erreurAuth) {
    console.error('Suppression du compte de connexion', id, erreurAuth.message)
    // Repli : connexion au moins fermée par bannissement
    const { error: erreurBan } = await serveur.auth.admin.updateUserById(id, { ban_duration: '876000h' })
    if (erreurBan) {
      console.error('Bannissement du compte de connexion', id, erreurBan.message)
      return json({ erreur: 'Compte vidé, mais la fermeture de la connexion a échoué. Contactez Keyli.' }, 500)
    }
  }

  return json({ supprime: true })
})
