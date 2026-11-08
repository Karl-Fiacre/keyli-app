// Paramètres des écrans (React Navigation). Les noms reprennent les routes
// principales du web (docs/STRUCTURE_FRONTEND.md).
import type { NavigatorScreenParams } from '@react-navigation/native'

export type ParamsOnglets = {
  Accueil: undefined
  Recherche: undefined
  Messages: undefined
  Profil: undefined
}

export type ParamsRacine = {
  Onglets: NavigatorScreenParams<ParamsOnglets>
  FicheAnnonce: { id: string }
  Compte: NavigatorScreenParams<ParamsCompte>
}

// Parcours de compte (connexion, inscription, mot de passe oublié)
export type ParamsCompte = {
  Connexion: undefined
  Inscription: undefined
  MotDePasseOublie: undefined
}
