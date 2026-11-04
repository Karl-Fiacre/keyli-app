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
- [ ] La recherche par rayon, quand elle sera faite, devra passer par une
      fonction de la base (le client ne lit plus `geolocation`).

## Toujours à trancher (n'a pas changé)
- [ ] Rayon par défaut proposé à l'utilisateur
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

