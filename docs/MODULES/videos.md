# Module — Vidéos Keyli (publicités et vidéo de l'accueil)

Demande du porteur (2026-11-06) : animations cinématiques, trois vidéos —
deux publicités (voix off femme, voix off homme) et une vidéo de l'accueil
montrant les atouts (recherche, carte et coordonnées GPS). Choix du
porteur : voix Windows, motion design (interface recréée, pas de captures),
publicités de 30 s et vidéo d'accueil de 45 s sans voix.

## Projet
Dossier `video/` (projet Remotion autonome, hors du build du site, ignoré
par ESLint ; `video/node_modules` et `video/out` non versionnés).

| Fichier | Rôle |
|---|---|
| `src/theme.ts` | Charte (mêmes couleurs que `src/index.css`), polices, courbes |
| `src/elements/Ambiance.tsx` | Fond cinéma (halo qui dérive, vignette, grain), reflet, légende |
| `src/elements/CarteAbidjan.tsx` | Carte schématique d'Abidjan (lagune, littoral, communes, repères de prix) |
| `src/scenes/*.tsx` | Problème, vérification, recherche, carte et GPS, contact et avis, logo |
| `src/Pub.tsx` | Publicité : montage calé sur la durée réelle de chaque phrase de voix off |
| `src/Accueil.tsx` | Vidéo du site (45 s, légendes à l'écran) |
| `scripts/voix.ps1` | Voix off (Windows : Julie pour la femme, Paul pour l'homme), une piste par phrase |
| `scripts/texte-pub.json` | Texte de la voix off (5 phrases) |
| `scripts/musique.py` | Nappe musicale générée par calcul (aucune musique sous droits) |
| `scripts/rendre.mjs` | Rendu des cinq fichiers |
| `scripts/controle.mjs` | Images fixes de contrôle |

Logo et badge : fichiers officiels copiés dans `video/public/` (jamais
redessinés, `docs/LOGO.md`). Biens, prix, prénom et conversation affichés
sont fictifs (démonstration).

## Commandes (dans `video/`)
```bash
npm install
npm run voix          # régénère les voix off après modification du texte
python scripts/musique.py
npm run studio        # aperçu et retouches dans Remotion Studio
npm run render:all    # rendu dans video/out/
```

## Sorties
- `keyli-pub-voix-femme-16x9.mp4`, `keyli-pub-voix-homme-16x9.mp4` (1920 × 1080)
- `keyli-pub-voix-femme-9x16.mp4`, `keyli-pub-voix-homme-9x16.mp4` (1080 × 1920 :
  WhatsApp, TikTok, Reels)
- `keyli-accueil.mp4` (1280 × 720, sans son) → copiée dans `public/videos/`
  avec son image d'attente `keyli-accueil.jpg`, affichée sur l'accueil par
  `src/components/accueil/VideoAtouts.tsx` (lecture muette quand la vidéo
  est visible, pas de préchargement, pas de lecture automatique si
  l'utilisateur limite les animations).

## Remplacer la voix
Les voix Windows sont synthétiques. Pour une voix professionnelle
(comédien ou service payant), déposer un fichier par phrase sous le même
nom (`public/voix/femme-s1.wav`…), mettre à jour `src/durees-voix.json`,
puis relancer le rendu : le montage se recale tout seul.

## Points ouverts
- Adresse du site à ajouter sur l'écran final quand keyli.com sera branché
  (aujourd'hui : « Rejoignez le pilote à Abidjan »).
- La vidéo publicitaire « grand format » de fin de projet (après l'app
  mobile) reste prévue.
