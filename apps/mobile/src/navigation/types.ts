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
  // source : provenance de la visite (statistiques de conversion).
  // arrivee, depart, voyageurs : dates d'une recherche de séjour (Sprint 19)
  FicheAnnonce: { id: string; source?: string; arrivee?: string; depart?: string; voyageurs?: number }
  // Fil de la messagerie Keyli (propertyId null : conversation directe).
  // nom et titre : affichage immédiat, avant le chargement des messages
  Conversation: { propertyId: string | null; interlocuteur: string; nom?: string; titre?: string }
  Favoris: undefined
  Alertes: undefined
  // Réservé aux propriétaires et aux agences (Sprint 15)
  PublierAnnonce: undefined
  // Documents de vérification du compte et ACD des biens (Sprint 16)
  Verification: undefined
  // Forfait et échéance, lecture seule : paiement sur le site (2026-11-20)
  Abonnement: undefined
  // Retours à l'équipe Keyli et réponses (Sprint 18, bêta)
  Retours: undefined
  // Mes séjours et demandes reçues (Sprint 19)
  Reservations: undefined
  // Conformité des boutiques (Sprint 20)
  UtilisateursBloques: undefined
  SupprimerCompte: undefined
  Compte: NavigatorScreenParams<ParamsCompte>
}

// Parcours de compte (connexion, inscription, mot de passe oublié)
export type ParamsCompte = {
  Connexion: undefined
  Inscription: undefined
  MotDePasseOublie: undefined
}
