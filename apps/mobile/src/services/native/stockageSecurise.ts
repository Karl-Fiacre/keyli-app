// Stockage de la session Supabase dans le coffre de l'appareil (Keychain
// iOS, Keystore Android — expo-secure-store). Le coffre limite chaque valeur
// à environ 2 Ko alors qu'une session dépasse souvent cette taille : la
// valeur est découpée en morceaux, plus un compteur.
// Navigateur (essais `expo start --web` seulement) : localStorage.
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const TAILLE_MORCEAU = 1800
// Clés autorisées par le coffre : lettres, chiffres, « . », « - », « _ »
const cleSure = (cle: string) => cle.replace(/[^A-Za-z0-9._-]/g, '_')

async function supprimerMorceaux(cle: string, aPartirDe: number) {
  for (let i = aPartirDe; ; i++) {
    const nom = `${cle}.${i}`
    if ((await SecureStore.getItemAsync(nom)) === null) return
    await SecureStore.deleteItemAsync(nom)
  }
}

export const stockageSecurise = {
  async getItem(cleBrute: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(cleBrute) ?? null
    const cle = cleSure(cleBrute)
    const nombre = Number(await SecureStore.getItemAsync(`${cle}.n`))
    if (!nombre) return null
    const morceaux: string[] = []
    for (let i = 0; i < nombre; i++) {
      const m = await SecureStore.getItemAsync(`${cle}.${i}`)
      // Morceau manquant : session illisible, l'utilisateur se reconnecte
      if (m === null) return null
      morceaux.push(m)
    }
    return morceaux.join('')
  },

  async setItem(cleBrute: string, valeur: string): Promise<void> {
    if (Platform.OS === 'web') return globalThis.localStorage?.setItem(cleBrute, valeur)
    const cle = cleSure(cleBrute)
    const nombre = Math.ceil(valeur.length / TAILLE_MORCEAU)
    for (let i = 0; i < nombre; i++) {
      await SecureStore.setItemAsync(`${cle}.${i}`, valeur.slice(i * TAILLE_MORCEAU, (i + 1) * TAILLE_MORCEAU))
    }
    await SecureStore.setItemAsync(`${cle}.n`, String(nombre))
    await supprimerMorceaux(cle, nombre)
  },

  async removeItem(cleBrute: string): Promise<void> {
    if (Platform.OS === 'web') return globalThis.localStorage?.removeItem(cleBrute)
    const cle = cleSure(cleBrute)
    await SecureStore.deleteItemAsync(`${cle}.n`)
    await supprimerMorceaux(cle, 0)
  },
}
