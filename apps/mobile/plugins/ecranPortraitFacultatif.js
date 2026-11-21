// L'app est verrouillée en portrait ("orientation": "portrait" dans
// app.json). Google Play en déduit que l'écran portrait est obligatoire
// (android.hardware.screen.portrait) et refuse l'installation sur les
// appareils qui n'en ont pas (ordinateurs, casques XR, certaines
// tablettes). On le déclare facultatif : l'app reste en portrait là où
// c'est possible, sans exclure ces appareils (avertissement Play du
// 2026-11-21).
const { withAndroidManifest } = require('expo/config-plugins')

const FONCTIONNALITE = 'android.hardware.screen.portrait'

module.exports = function ecranPortraitFacultatif(config) {
  return withAndroidManifest(config, (config) => {
    const manifeste = config.modResults.manifest
    const fonctionnalites = (manifeste['uses-feature'] ??= [])
    const existante = fonctionnalites.find((f) => f.$?.['android:name'] === FONCTIONNALITE)
    if (existante) existante.$['android:required'] = 'false'
    else fonctionnalites.push({ $: { 'android:name': FONCTIONNALITE, 'android:required': 'false' } })
    return config
  })
}
