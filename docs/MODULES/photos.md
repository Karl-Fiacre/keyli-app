# MODULE : Photos des annonces (Cloudinary)

## Décisions (porteur, 2026-11-01)
- **1 photo minimum pour publier, 10 au plus** par annonce — contrôlé en
  base (RPC `publier_annonce_keyli`, trigger `limites_photos_keyli`).
- Photos choisies dans le formulaire de publication, puis ajoutées,
  retirées et réordonnées depuis « Mes annonces » (bouton « Photos »).
- La première photo est la photo principale (`main_image_url`, tenue à jour
  par le trigger `sync_main_image_keyli`).

## Fonctionnement
```
Navigateur ── nombre de photos ──► Edge Function cloudinary-signature
           ◄── url d'envoi, api_key, signatures (une par photo) ──
Navigateur ── photo compressée + paramètres signés ──► Cloudinary
           ◄── secure_url ──
Navigateur ── adresses ──► publier_annonce_keyli / property_media_keyli
                           (la base refuse toute autre adresse)
```
- **cloudinary-signature** (JWT exigé) : réservé aux propriétaires et
  agences actifs. Impose l'identifiant `keyli/annonces/<compte>/<uuid>`,
  les formats `jpg, jpeg, png, webp` et le redimensionnement à l'arrivée
  (`c_limit,h_2000,w_2000`) — le navigateur ne peut rien changer sans
  casser la signature. Secrets : `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Base** : `url_photo_keyli_valide(url, compte)` n'accepte que
  `https://res.cloudinary.com/<compte Keyli>/image/upload/[v…/]keyli/annonces/<compte>/<uuid>.<ext>`.
  Le nom du compte Cloudinary est fixé dans `cloudinary_cloud_keyli()`
  (public, présent dans toute adresse d'image) : le changer demande une
  migration.
- **Navigateur** (`src/lib/cloudinary.ts`) : compression avant envoi (côté
  le plus long 2000 px, JPEG qualité 0,85 — souvent 4-8 Mo → moins de 1 Mo,
  important sur les réseaux mobiles), trois envois en parallèle, barre de
  progression. Affichage via `urlPhoto()` : correction automatique, puis
  `f_auto,q_auto` + recadrage à la taille utile (vignettes 160-640 px,
  galerie 640/1280 px).
- **Correction automatique des photos** (décision du porteur, 2026-11-13) :
  `CORRECTION_PHOTO` = `e_improve/e_sharpen:80`, ajoutée par `urlPhoto()`
  (`src/partage/lib/photos.ts`, donc web ET mobile) devant chaque photo
  Cloudinary. `e_improve` rééquilibre lumière, contraste et couleurs
  (débouche les zones d'ombre, ravive une photo terne) ; `e_sharpen:80`
  redonne du piqué à une photo un peu floue. Appliquée à l'affichage : la
  photo d'origine de l'annonceur reste intacte dans Cloudinary, le réglage
  peut être changé ou retiré sans renvoyer aucune photo. Une adresse hors
  Cloudinary n'est pas modifiée. Coût : chaque taille affichée est une
  transformation Cloudinary de plus (calculée une fois, puis en cache) —
  surveiller le quota de l'offre gratuite.
- Écrans : `GrillePhotos` (choix, ordre, retrait), `GestionPhotos` (Mes
  annonces), `GaleriePhotos` (fiche d'annonce : grande photo, flèches,
  vignettes).

## Limites connues
- Une photo envoyée puis abandonnée (publication annulée ou refusée) reste
  dans Cloudinary sans être référencée. Nettoyage possible plus tard par
  une tâche planifiée (liste des ressources du dossier `keyli/annonces/`
  absentes de `property_media_keyli`).
- Retirer une photo ne la supprime pas de Cloudinary (même nettoyage).
- `validate-property-image` (modération automatique avant publication,
  annonces.md étape 5) : non fait. La modération passe par les
  signalements (motif « photos non conformes ») et le back-office.
- Vidéos (`media_type = 'video'`) : non prévues pour le pilote.

## Mise en service
- [x] Compte Cloudinary créé (porteur, 2026-11-01) — offre gratuite
      suffisante pour le pilote
- [x] Nom du compte (cloud name) `djizi4dod` reporté dans
      `cloudinary_cloud_keyli()`
- [x] Secrets posés par le porteur (2026-11-01) : `npx supabase secrets set
      CLOUDINARY_CLOUD_NAME=… CLOUDINARY_API_KEY=… CLOUDINARY_API_SECRET=…`
- [x] Edge Function déployée, migration poussée (2026-11-01)
- [ ] Site redéployé (`npm run deploy`, porteur), test réel de publication

## Mobile (Sprint 15, 2026-11-11)
Même circuit sur le téléphone (caméra ou galerie → compression
`expo-image-manipulator` → envoi signé direct à Cloudinary), avec les règles
communes de `src/partage/lib/photos.ts` (limites, réduction, champs signés,
lecture des réponses) et `demanderSignaturesPhotos`. Détail :
`docs/MODULES/mobile.md`, section Sprint 15.
