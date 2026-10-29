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

## ⚠️ LOGO OFFICIEL (fourni par le porteur le 2026-11-02) — remplace le précédent
Sources canoniques, fond transparent, dans `keyli_brand_assets/sources/` :
```
keyli-logo-source.png    logotype complet « Keyli » : K bleu dont le haut
                         porte un toit turquoise, anneau turquoise en bas
                         à gauche (1024 × 1024)
keyli-icone-source.png   icône seule (K + toit + anneau), base du favicon
                         et des icônes d'application (1254 × 1254)
```
Toutes les déclinaisons sont produites par `keyli_brand_assets/generer-raster.cjs`
(recadrage, redimensionnement, fond plein si la plateforme l'exige ;
variante « fond sombre » = bleu du logotype passé en blanc, turquoise
inchangé). Aucun dessin refait. Sorties dans `keyli_brand_assets/raster/` :
```
keyli-logo-{120,240,480,960}.png        logotype, fond clair (en-tête : 120/240/480)
keyli-logo-blanc-{120,240,480,960}.png  logotype, fond sombre
keyli-icone-{64,128,256,512}.png        icône transparente
favicon-{16,32,48}.png, favicon.ico     favicons (icône quasi plein cadre)
apple-touch-icon.png (180)              iOS, fond blanc
icon-192.png, icon-512.png              PWA, fond blanc
icon-maskable-512.png                   PWA « maskable » (zone sûre 80 %)
keyli_app_icon_1024.png                 icône d'app iOS, fond blanc
keyli_app_icon_adaptive_foreground_432.png  calque Android adaptatif
                                        (fond blanc à déclarer dans le XML)
```
Copies servies par le web dans `public/` (avec `manifest.webmanifest`).
Couleurs du logo : bleu roi et turquoise — charte alignée le 2026-11-02
(voir DESIGN_SYSTEM.md : `--primary-glow` = bleu du logo, `--turquoise`).

## Anciens assets (2026-10-23) — obsolètes, plus utilisés par l'application
Conservés pour l'historique en attendant l'accord du porteur pour les retirer.

Tous générés par `keyli_brand_assets/generer.cjs` à partir d'UNE géométrie
unique, relevée sur l'icône source `design-reference/icons/app_icon_source.png`
(clé dont le panneton est une maison, serrure dorée, deux dents ; sommet du
toit centré en x = 512 sur 1024). Aucune réinterprétation du dessin.
```
assets/keyli-logo-full.svg              → logotype complet (clé + KEYLI), fond clair
assets/keyli-logo-full-blanc.svg        → logotype complet, fond sombre
assets/keyli_verified_badge.svg         → badge vérifié (marque distincte)
keyli_brand_assets/keyli-mark.svg       → clé seule, navy (fond clair)
keyli_brand_assets/keyli-mark-blanc.svg → clé seule, blanche (fond sombre)
keyli_brand_assets/keyli_app_icon.svg / keyli_app_icon_1024.png
                                        → icône d'app, fond navy plein (iOS/Android)
keyli_brand_assets/keyli_app_icon_adaptive_foreground_432.png
                                        → calque transparent Android adaptive icon
                                          (clé dans la zone sûre de 66 % ; fond navy
                                          #1a1f2e à renseigner dans le XML)
keyli_brand_assets/favicon.svg / favicon.ico (16, 32, 48)
                                        → panneton seul (maison + serrure), comme
                                          favicon_source.png : la clé entière est
                                          illisible à 16 px
```
Mot « KEYLI » : Caladea Bold (licence libre OFL, métriquement équivalente à
Cambria, la police des titres de DESIGN_SYSTEM.md), converti en tracés —
aucune police requise à l'affichage. Les copies servies par l'application
web sont dans `public/`.

Pour modifier la marque : changer `generer.cjs` et régénérer, jamais
retoucher un fichier à la main (sinon les déclinaisons divergent).

## Règle d'usage
- Le logo Keyli n'a, à ce jour, aucune restriction équivalente à celle d'un
  logo école en marque blanche (pas de concept de tenant chez Keyli) — il
  peut apparaître sur tous les écrans de l'application et les documents
  Keyli (pitch deck, PRD).
- Le badge de vérification n'apparaît QUE sur un bien ou un profil
  effectivement vérifié (`properties_keyli.is_verified = true` ou
  `profiles_keyli.verified = true`) — jamais comme élément décoratif.
