# MODULE : Géolocalisation & recherche par rayon

## Décision actée (remplace la version précédente de ce fichier)
Nouveau compte Supabase, nouveau projet, **schéma reconstruit de zéro** — pas
de migration de l'ancien schéma. PostGIS activé dès la première migration,
avant toute table métier. La colonne `geolocation` legacy (POINT sans
extension) n'est PAS reprise telle quelle dans le nouveau schéma.

## Ce qui est tranché
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

-- properties_keyli.geolocation dès la création de la table :
geolocation  geography(Point, 4326) NOT NULL

-- Index spatial obligatoire, créé dans la même migration :
CREATE INDEX idx_properties_geolocation ON properties_keyli USING GIST (geolocation);

-- Requête par rayon (exemple, km) :
SELECT * FROM properties_keyli
WHERE ST_DWithin(geolocation, ST_MakePoint(:lng, :lat)::geography, :rayon_metres);
```
PostGIS retenu plutôt qu'`earthdistance` — le schéma repart de zéro, autant
prendre l'option la plus robuste (index GiST, extensible à des zones/polygones
plus tard) puisque le coût de migration de données n'existe plus pour
justifier l'option la plus légère.

## Carte du catalogue (2026-11-04)
- [x] Vue « Carte » du catalogue (Accueil et Recherche), bascule
      Liste | Carte mémorisée dans le navigateur ; repères de prix
      (pleins = annonce vérifiée), aperçu de l'annonce au clic.
- [x] **Positions approximatives** (décision du porteur) :
      `positions_annonces_keyli`, case ≈ 450 m ; zoom maximum 16 ; mention
      « Positions approximatives » sous la carte. La position exacte n'est
      plus lisible par le client (DATABASE.md, 2026-11-04).
- [x] La recherche par rayon passe par une fonction de la base (le client
      ne lit plus `geolocation`) — voir ci-dessous.

## Recherche par rayon (2026-11-14)
Décisions du porteur (option A à chaque question) :
- rayons proposés **1, 3, 5, 10 km**, **5 par défaut** (la base accepte
  0,5 à 20 km) ;
- point de recherche = **position GPS de l'utilisateur** (bouton « Autour
  de moi » : `expo-location` sur mobile, géolocalisation du navigateur sur
  le web). La position reste en mémoire dans l'écran : jamais dans l'URL,
  jamais enregistrée ;
- le rayon **remplace commune et quartier** ; prix, type, pièces, meublé,
  équipements, dates restent cumulés ; à tri égal, les plus proches
  d'abord ;
- chaque résultat affiche une **distance arrondie** au demi-kilomètre
  (« à environ 2 km », 0,5 km au minimum), `libelleDistance` partagé.

Base (`20261119120000_recherche_rayon_keyli.sql`) :
- `annonces_autour_keyli(lat, lng, rayon_km)` (security definer) renvoie
  seulement `id` + `distance_km` arrondie. Présélection par l'index GiST
  (`ST_DWithin` sur la position exacte, marge de 700 m), puis filtre et
  distance **sur la position approximative** : sinon, en déplaçant le
  centre, on retrouverait le point exact d'une annonce par
  trilatération.
- `rechercher_annonces_keyli` reçoit `p_lat`, `p_lng`, `p_rayon_km` et
  renvoie `distance_km` (null sans rayon).
- Tests : `supabase/tests/recherche_rayon_keyli.test.sql`.

Interface : `apps/mobile/src/composants/FiltreAutour.tsx` (sous le titre de
la recherche, en liste comme en carte ; sur la carte, cercle du rayon et
point bleu de l'utilisateur) et `src/components/annonce/FiltreAutour.tsx`
(web). « Créer une alerte » est masqué pendant une recherche par rayon (les
alertes ne reprennent pas ce rayon).

## Toujours à trancher (n'a pas changé)
- [x] Rayon par défaut proposé à l'utilisateur — 5 km (2026-11-14)
- [ ] Unité affichée (distance seule, ou aussi temps de trajet estimé — Google
      Routes API, non intégrée actuellement)
- [ ] Interface de sélection du point (géolocalisation utilisateur, adresse
      saisie, clic sur carte — probablement les trois, ordre non défini)
- [ ] Interaction avec les filtres existants (cumulatif avec quartier/prix,
      ou remplace le filtre quartier quand actif ?)

## Règles
- [ ] `useGeolocation.ts` (position de l'utilisateur côté client) reste tel
      quel — c'est la moitié "où est l'utilisateur" du problème, toujours
      valide avec le nouveau schéma
- [x] Affichage carte : Google Maps JavaScript API (remplace Mapbox, décision
      du 2026-10-31) — PostGIS ne change rien côté affichage, seulement côté
      requête
- [x] Carte aux couleurs Keyli (2026-11-01) — style cloud « Keyli – web »
      associé au Map ID dans Google Cloud (projet Nguessan-IT), source
      versionnée : `docs/reference/google-maps-style-keyli.json` (toute
      retouche : modifier ce fichier puis le réimporter dans la console,
      onglet JSON). Repère maison `src/lib/repereCarte.ts` (goutte bleu nuit,
      maison turquoise, tokens CSS). Commerces et restaurants masqués ;
      hôpitaux, écoles, parcs, aéroport et lieux repères gardés. Gestes
      « coopératifs » (deux doigts sur mobile) pour ne pas bloquer le défilement
- [ ] Ne jamais requêter `ST_DWithin` sans l'index GiST correspondant — sur
      la table complète, ça ne passera pas à l'échelle après quelques
      centaines de biens

