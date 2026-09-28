# Logo Keyli — Source canonique

## ⚠️ RÈGLE ABSOLUE
Ne jamais redessiner ou approximer le logo à partir d'une description — utiliser
uniquement les fichiers sources listés ci-dessous. Le logo précédent avait un
bug de symétrie corrigé une fois (sommet du toit mal centré) — toute
régénération doit repartir des fichiers sources, pas d'une nouvelle
interprétation.

## 2 marques distinctes, 2 usages
| Marque | Usage | Ne pas confondre avec |
|---|---|---|
| Logo Keyli (clé + toit) | Identité de marque : header, splash, favicon, icône d'app | Le badge vérifié |
| Badge de vérification (cercle + coche) | Affiché SUR une annonce/un profil pour signaler qu'il a été vérifié par l'équipe terrain | Le logo — jamais utilisé comme identité de marque |

## Palette
Voir `DESIGN_SYSTEM.md` — source unique de la palette, y compris la
fragmentation réelle des couleurs d'accent par écran (gold sur l'Accueil,
violet/orange/rouge contextuels sur les dashboards). Ne pas dupliquer ces
valeurs ici : c'est exactement une seconde copie de palette qui a permis à
cette fragmentation de passer inaperçue jusqu'à un rescan explicite.

## Assets disponibles
```
assets/keyli_verified_badge.svg              → badge vérifié, vectoriel
```
Icônes favicon et app (PNG/ICO, déjà générées) : voir dossier
`keyli_brand_assets/` livré séparément —
`favicon.ico`, `keyli_app_icon_1024.png` (fond navy plein, iOS/Android),
`keyli_app_icon_adaptive_foreground_432.png` (calque transparent, Android
adaptive icon — fond navy `#1a1f2e` à renseigner séparément dans le XML).

## Assets à créer
- `assets/keyli-logo-full.svg` — logotype complet (marque + mot "KEYLI"),
  actuellement seulement esquissé en aperçu chat, pas encore un fichier
  source livré. Ne pas coder le logo directement en JSX/SVG dans les
  composants sans ce fichier source unique — sinon chaque écran risque une
  version légèrement différente.

## Règle d'usage
- Le logo Keyli n'a, à ce jour, aucune restriction équivalente à celle d'un
  logo école en marque blanche (pas de concept de tenant chez Keyli) — il
  peut apparaître sur tous les écrans de l'application et les documents
  Keyli (pitch deck, PRD).
- Le badge de vérification n'apparaît QUE sur un bien ou un profil
  effectivement vérifié (`properties_keyli.is_verified = true` ou
  `profiles_keyli.verified = true`) — jamais comme élément décoratif.
