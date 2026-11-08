// Configuration Metro de l'application mobile Keyli.
// La logique métier vit dans `src/partage/` du web (docs/LOGIQUE_PARTAGEE.md) :
// Metro surveille ce dossier et résout les alias `@/…` comme le web, sauf
// les deux points d'entrée fournis par le mobile (client Supabase et
// services de l'appareil). Les bibliothèques (React, React Query, zod,
// supabase-js) viennent TOUJOURS de apps/mobile/node_modules : une seconde
// copie de React, prise dans le node_modules du web, casserait les hooks.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const racineMobile = __dirname
const racineDepot = path.resolve(racineMobile, '../..')
const srcWeb = path.join(racineDepot, 'src')
const srcMobile = path.join(racineMobile, 'src')

const config = getDefaultConfig(racineMobile)

config.watchFolders = [path.join(srcWeb, 'partage'), path.join(srcWeb, 'integrations', 'supabase')]
config.resolver.nodeModulesPaths = [path.join(racineMobile, 'node_modules')]
config.resolver.disableHierarchicalLookup = true

// Alias : le mobile fournit son client et sa plateforme ; le reste vient du web
const ALIAS = [
  ['@/integrations/supabase/client', path.join(srcMobile, 'integrations', 'supabase', 'client')],
  ['@/integrations/supabase/types', path.join(srcWeb, 'integrations', 'supabase', 'types')],
  ['@/plateforme', path.join(srcMobile, 'plateforme')],
]

config.resolver.resolveRequest = (context, nom, plateforme) => {
  for (const [alias, cible] of ALIAS) {
    if (nom === alias) return context.resolveRequest(context, cible, plateforme)
  }
  if (nom.startsWith('@/partage/')) {
    return context.resolveRequest(context, path.join(srcWeb, nom.slice(2)), plateforme)
  }
  if (nom.startsWith('@mobile/')) {
    return context.resolveRequest(context, path.join(srcMobile, nom.slice('@mobile/'.length)), plateforme)
  }
  if (nom.startsWith('@/')) {
    // Tout autre import `@/…` dans le code partagé est interdit (lint du web)
    throw new Error(`Import « ${nom} » non disponible sur mobile (voir docs/LOGIQUE_PARTAGEE.md)`)
  }
  return context.resolveRequest(context, nom, plateforme)
}

module.exports = config
