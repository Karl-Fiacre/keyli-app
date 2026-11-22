// Version Android publiée : pas de réduction du code par R8.
// Depuis Expo SDK 58, le modèle Android active R8 en version de publication
// (android.enableMinifyInReleaseBuilds=true). R8 a cassé WorkManager
// (utilisé par les notifications) : l'app se fermait dès l'ouverture avec
// « Failed to create an instance of class androidx.work.impl.WorkDatabase »
// (version 5, reproduit sur émulateur le 2026-11-21). Sans R8, l'app est un
// peu plus lourde mais toutes les bibliothèques gardent leurs classes.
const { withGradleProperties } = require('expo/config-plugins')

const REGLAGES = {
  'android.enableMinifyInReleaseBuilds': 'false',
  'android.enableShrinkResourcesInReleaseBuilds': 'false',
}

module.exports = function sansReductionCodeAndroid(config) {
  return withGradleProperties(config, (config) => {
    for (const [cle, valeur] of Object.entries(REGLAGES)) {
      const existant = config.modResults.find((p) => p.type === 'property' && p.key === cle)
      if (existant) existant.value = valeur
      else config.modResults.push({ type: 'property', key: cle, value: valeur })
    }
    return config
  })
}
