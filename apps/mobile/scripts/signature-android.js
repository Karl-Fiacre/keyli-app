// Compilation Android sur Codemagic (Sprint 18) : après `expo prebuild`,
// la version de publication est encore signée avec la clé de débogage.
// Ce script la signe avec la clé d'envoi Google Play (keystore enregistré
// par le porteur dans Codemagic, variables CM_KEYSTORE_*) et fixe le
// numéro de version Android (versionCode).
// Usage : node scripts/signature-android.js <versionCode>
// Aucune clé ni mot de passe ici : tout est lu dans l'environnement de
// compilation.
const fs = require('fs')
const path = require('path')

const fichier = path.join(__dirname, '..', 'android', 'app', 'build.gradle')
const versionCode = Number(process.argv[2])
if (!Number.isInteger(versionCode) || versionCode < 1) {
  console.error('versionCode invalide : un entier positif est attendu')
  process.exit(1)
}
for (const nom of ['CM_KEYSTORE_PATH', 'CM_KEYSTORE_PASSWORD', 'CM_KEY_ALIAS', 'CM_KEY_PASSWORD']) {
  if (!process.env[nom]) {
    console.error(`${nom} manquante : vérifier la clé « keyli_upload » dans Codemagic (Android keystores)`)
    process.exit(1)
  }
}

let gradle = fs.readFileSync(fichier, 'utf8')

function remplacer(motif, remplacement, description) {
  if (!motif.test(gradle)) {
    console.error(`build.gradle : ${description} introuvable (modèle Expo modifié ?)`)
    process.exit(1)
  }
  gradle = gradle.replace(motif, remplacement)
}

remplacer(/versionCode \d+/, `versionCode ${versionCode}`, 'versionCode')
// D'abord la version de publication (avant d'ajouter un autre bloc
// « release » dans signingConfigs)
remplacer(
  /(release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
  '$1signingConfig signingConfigs.release',
  'signature de la version de publication',
)

// Clé d'envoi lue dans l'environnement au moment de la compilation
remplacer(
  /signingConfigs \{/,
  `signingConfigs {
        release {
            storeFile file(System.getenv("CM_KEYSTORE_PATH"))
            storePassword System.getenv("CM_KEYSTORE_PASSWORD")
            keyAlias System.getenv("CM_KEY_ALIAS")
            keyPassword System.getenv("CM_KEY_PASSWORD")
        }`,
  'bloc signingConfigs',
)
fs.writeFileSync(fichier, gradle)
console.log(`Android : signature de publication branchée, versionCode ${versionCode}`)
