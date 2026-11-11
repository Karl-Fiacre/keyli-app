// Paramètres des écrans (React Navigation). Les noms reprennent les routes
// principales du web (docs/STRUCTURE_FRONTEND.md).
import type { NavigatorScreenParams } from '@react-navigation/native'
import type { FiltresRecherche } from '@/partage/hooks/useRecherche'

export type ParamsOnglets = {
  Accueil: undefined
  // Filtres imposés à l'ouverture (ex. « Voir » depuis une alerte)
  Recherche: { filtres?: FiltresRecherche } | undefined
  Messages: undefined
  Profil: undefined
}

export type ParamsRacine = {
  // Premier écran d'un visiteur non connecté
  Bienvenue: undefined
  Onglets: NavigatorScreenParams<ParamsOnglets>
  // source : provenance de la visite (statistiques de conversion)
  FicheAnnonce: { id: string; source?: string }
  Favoris: undefined
  Alertes: undefined
  // Réservé aux propriétaires et aux agences (Sprint 15)
  PublierAnnonce: undefined
  // Documents de vérification du compte et ACD des biens (Sprint 16)
  Verification: undefined
  Compte: NavigatorScreenParams<ParamsCompte>
}

// Parcours de compte (connexion, inscription, mot de passe oublié)
export type ParamsCompte = {
  Connexion: undefined
  Inscription: undefined
  MotDePasseOublie: undefined
}
