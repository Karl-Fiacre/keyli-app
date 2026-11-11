// Position actuelle du téléphone, pour placer un bien sur la carte au moment
// de la publication (Sprint 15). Permission « pendant l'utilisation »
// seulement : aucune localisation en arrière-plan ici. expo-location est
// inclus dans Expo Go.
import * as Location from 'expo-location'
import { erreurKeyli } from '@/partage/lib/erreurs'

export interface Point {
  latitude: number
  longitude: number
}

export async function positionActuelle(): Promise<Point> {
  const autorisation = await Location.requestForegroundPermissionsAsync()
  if (!autorisation.granted) {
    throw erreurKeyli("Keyli n'a pas accès à votre position. Placez le bien sur la carte, ou autorisez la localisation.")
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
  return { latitude: position.coords.latitude, longitude: position.coords.longitude }
}
