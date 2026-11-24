// Finalise les comptes Keyli supprimés AVANT le correctif du 2026-11-24 :
// leur profil est vidé (compte_supprime_le renseigné) mais leur compte de
// connexion n'a été que banni, ce qui bloque pour toujours le même
// identifiant Apple / Google / email. Ce script applique la suppression
// « douce » de Supabase (email masqué, liens Apple/Google effacés, sessions
// fermées) : la personne peut ensuite recréer un compte neuf.
//
// À lancer sur l'ordinateur du porteur, jamais en ligne :
//   $env:SUPABASE_SERVICE_ROLE_KEY = "<clé service_role>"   (PowerShell)
//   node scripts/finaliser-suppressions.mjs
// La clé n'est lue que dans l'environnement : jamais écrite dans un fichier.
import { createClient } from '@supabase/supabase-js'

const URL_SUPABASE = 'https://zcqirdowjussoaevqlbd.supabase.co'
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!cle) {
  console.error('Variable SUPABASE_SERVICE_ROLE_KEY manquante (Supabase → Project Settings → API Keys).')
  process.exit(1)
}

const serveur = createClient(URL_SUPABASE, cle, { auth: { persistSession: false } })

const { data: profils, error } = await serveur
  .from('profiles_keyli')
  .select('user_id')
  .not('compte_supprime_le', 'is', null)
if (error) {
  console.error('Lecture des profils supprimés impossible :', error.message)
  process.exit(1)
}

console.log(`${profils.length} compte(s) supprimé(s) trouvé(s).`)
let ok = 0
for (const { user_id: id } of profils) {
  const { error: erreur } = await serveur.auth.admin.deleteUser(id, true)
  if (erreur && !/not found/i.test(erreur.message)) {
    console.error(`  ${id} : échec — ${erreur.message}`)
  } else {
    ok++
    console.log(`  ${id} : finalisé`)
  }
}
console.log(`Terminé : ${ok}/${profils.length}.`)
