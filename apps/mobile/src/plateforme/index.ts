// Services de l'appareil pour la logique partagée (contrat :
// src/partage/plateforme.ts). Le web fournit les siens dans src/plateforme.
import { Platform } from 'react-native'
import * as Crypto from 'expo-crypto'
import Storage from 'expo-sqlite/kv-store'
import type { Plateforme } from '@/partage/plateforme'

// Adresse du site Keyli : les liens des emails (confirmation, mot de passe
// oublié) s'ouvrent sur le site, qui gère ces étapes
const SITE = (process.env.EXPO_PUBLIC_KEYLI_SITE_URL ?? 'https://keyli-2gc.pages.dev').replace(/\/+$/, '')

export const plateforme: Plateforme = {
  // Stockage synchrone exigé par le contrat : clé-valeur SQLite d'Expo
  // (inclus dans Expo Go) ; navigateur : localStorage
  stockage: {
    lire(cle) {
      try {
        return Platform.OS === 'web' ? (globalThis.localStorage?.getItem(cle) ?? null) : Storage.getItemSync(cle)
      } catch {
        return null
      }
    },
    ecrire(cle, valeur) {
      try {
        if (Platform.OS === 'web') globalThis.localStorage?.setItem(cle, valeur)
        else Storage.setItemSync(cle, valeur)
      } catch {
        // Stockage indisponible : sans conséquence
      }
    },
  },
  urlApp: (chemin) => `${SITE}${chemin}`,
  nouvelId: () => Crypto.randomUUID(),
}
