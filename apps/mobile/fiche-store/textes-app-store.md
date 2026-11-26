# Fiche App Store — Keyli (Français)

À coller dans App Store Connect → Apps → Keyli. Même contenu que la fiche
Play (`textes-play.md`), adapté aux limites d'Apple.

## Captures d'écran (obligatoires)

Dossier `captures-iphone-6.7/` : 7 images 1290 x 2796 (iPhone 6,7 pouces),
générées à partir des captures de la fiche Play (fond Keyli + légende).
App Store Connect → version → « Aperçus et captures d'écran » → iPhone
6,7" (ou 6,9") : glisser les 7 images dans l'ordre. Pas d'iPad
(`supportsTablet: false`).

À terme, les remplacer par de vraies captures prises sur iPhone (bouton
latéral + volume haut) : celles-ci viennent d'Android (flèche retour
Android), ce qu'Apple tolère dans un cadre marketing mais peut relever.

## Informations sur l'app (App Information)

- Nom : **Keyli**
- Sous-titre (30 car. max.) : **Immobilier et séjours vérifiés**
- Catégorie principale : **Style de vie** ; secondaire : **Voyages**
- Classification par âge : voir plus bas
- URL de la politique de confidentialité : https://keyli-2gc.pages.dev/confidentialite

## Version 0.1.0 (page de la version)

### Texte promotionnel (170 car. max., modifiable sans nouvelle version)

Annonces vérifiées, avis après visite et réservation de séjours : trouvez votre logement en Côte d'Ivoire en toute confiance.

### Mots-clés (100 car. max., séparés par des virgules, sans espace)

immobilier,location,appartement,maison,villa,studio,hôtel,auberge,abidjan,côte d'ivoire,séjour

### Description (4 000 car. max.)

Reprendre la « Description complète » de `textes-play.md` telle quelle.

### URL d'assistance

https://keyli-2gc.pages.dev

### URL marketing (facultatif)

https://keyli-2gc.pages.dev

### Copyright

2026 Nguessan-IT

## Informations pour la vérification d'Apple (App Review)

- Connexion requise : **oui** — compte de test (le même que celui donné à
  Google dans la Play Console) : email + mot de passe, saisis par le
  porteur.
- Coordonnées : nom, téléphone et email du porteur.
- Notes (à coller) :

```
Keyli est une plateforme d'annonces immobilières et de séjours en Côte d'Ivoire.
- Consultation libre sans compte : écran d'accueil → « Découvrir les annonces sans compte ».
- Connexion : email et mot de passe (compte de test ci-dessus), Google ou « Se connecter avec Apple ».
- Suppression du compte dans l'app : Profil → « Supprimer mon compte » → taper SUPPRIMER.
- Contenu publié par les utilisateurs : signalement d'une annonce (fiche annonce → « Signaler cette annonce ») et signalement ou blocage d'un utilisateur (conversation → menu « … » → « Bloquer ») ; les signalements sont traités par l'équipe Keyli.
- Aucun achat dans l'app : les forfaits des annonceurs professionnels se règlent hors de l'application ; l'écran Abonnement est en lecture seule, sans lien ni bouton d'achat.
- Localisation : uniquement pendant l'utilisation, pour placer un bien sur la carte et chercher autour de soi.
```

## Classification par âge (questionnaire)

- Contenus violents, sexuels, jeux d'argent, drogues, etc. : **Aucun**
- Contenu généré par les utilisateurs / messagerie entre utilisateurs :
  **Oui** (annonces, messages, avis) — avec signalement et blocage.
- Accès web illimité : **Non**
- Résultat calculé par Apple : 4+ ; relevé à **13+** (remplacement, 2026-11-26)
  à cause de la messagerie entre utilisateurs — affiché 12+ ou 13+ selon
  les pays, cohérent avec la classification IARC de Google (12+).
- Saisi et enregistré dans App Store Connect le 2026-11-26, de même que la
  confidentialité (publiée).

## Confidentialité de l'app (App Privacy — « Nutrition label »)

Suivi publicitaire (tracking) : **Non** pour toutes les données. Aucune
donnée n'est utilisée pour la publicité ni vendue.

| Donnée Apple | Collectée | Liée à l'identité | Finalité |
|---|---|---|---|
| Nom | Oui | Oui | Fonctionnalités de l'app |
| Adresse e-mail | Oui | Oui | Fonctionnalités de l'app |
| Numéro de téléphone | Oui (facultatif) | Oui | Fonctionnalités de l'app |
| Localisation précise | Oui | Oui | Fonctionnalités de l'app (position du bien publié) |
| Photos ou vidéos | Oui | Oui | Fonctionnalités de l'app (photos des annonces) |
| Autre contenu utilisateur (messages, avis, signalements) | Oui | Oui | Fonctionnalités de l'app |
| Assistance client (« Donner mon avis ») | Oui | Oui | Fonctionnalités de l'app |
| Historique de recherche (alertes de recherche enregistrées) | Oui | Oui | Fonctionnalités de l'app |
| Autres données (pièces d'identité pour la vérification) | Oui | Oui | Fonctionnalités de l'app |
| Identifiant utilisateur | Oui | Oui | Fonctionnalités de l'app |
| Historique d'achats (forfaits réglés sur le site, affichés dans l'app) | Oui | Oui | Fonctionnalités de l'app |

Non collectées : contacts, santé, données financières (cartes : gérées par
Paystack sur le site), historique de navigation, diagnostics, données
publicitaires, identifiant de l'appareil pour la publicité.

## Prix et disponibilité

- Prix : **Gratuit**
- Pays : tous (comme sur Google Play : Côte d'Ivoire, France et reste du
  monde).
- Enregistré le 2026-11-26 : prix 0,00 $ (pays de base États-Unis, prix
  identique partout), disponible dans les 175 pays ou régions et les
  futurs, sans précommande.
- Chine continentale retirée le 2026-11-26 (174 pays) : Apple y exige une
  évaluation de sécurité, une déclaration AIGC et un numéro ICP (entité
  chinoise). Hong Kong, Macao et Taïwan restent disponibles. Réversible à
  tout moment dans « Gérer la disponibilité ».
- Droits sur le contenu (page Informations) : « Oui, contenus tiers et
  droits nécessaires » (annonces et photos publiées par les utilisateurs,
  licence prévue dans les mentions légales), enregistré le 2026-11-26.

## Chiffrement (export)

Déjà déclaré dans l'app (`usesNonExemptEncryption: false`) : Apple ne pose
plus la question à chaque compilation.
