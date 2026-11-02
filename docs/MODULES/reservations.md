# MODULE : Séjours courts et demandes de réservation

## Décisions (porteur, 2026-11-01) — amendement du PRD §5.2 / §12.1
La réservation par dates (inspirée de Booking) entre dans la v1, sous une
forme volontairement limitée :
- **Demande de réservation** : le voyageur choisit arrivée et départ, voit
  le total calculé par la base, envoie une demande ; l'hôte accepte ou
  refuse. **Pas de paiement en ligne** : le séjour se règle directement
  avec l'hôte. Le paiement en ligne (Paystack marketplace, commission,
  annulation, remboursement) reste une étape ultérieure, à décider.
- **Hôtels et auberges : types de chambres** (nom, quantité, prix par nuit,
  voyageurs par chambre). La base compte les chambres libres chaque nuit.
- **Séjours courts uniquement** : hôtels, auberges, et tout logement à
  louer que l'annonceur marque « séjour court » (son prix devient le prix
  par nuit). Locations au mois et ventes : mise en relation inchangée.

## Règles (garanties par la base)
- Seule une réservation **acceptée** bloque des nuits ; une demande n'en
  bloque pas (plusieurs voyageurs peuvent demander les mêmes dates).
- À l'acceptation, la base revérifie la disponibilité sous verrou de
  l'annonce (deux acceptations simultanées ne dépassent jamais la
  capacité) puis **refuse d'office** les demandes devenues impossibles
  (motif « Dates plus disponibles »).
- Prix, nombre de nuits et total : `devis_sejour_keyli` — même fonction
  pour l'affichage et pour l'enregistrement ; l'écran n'additionne rien.
- Contrôles : arrivée ≥ aujourd'hui (fuseau Africa/Abidjan), au plus un an
  à l'avance, 1 à 90 nuits, minimum de nuits de l'annonce, capacité en
  voyageurs (logement : `voyageurs_max` ; hôtel : voyageurs par chambre ×
  nombre de chambres), nombre de chambres ≤ quantité du type.
- Anti-abus : une seule demande en attente par voyageur et par annonce,
  dix au plus en tout ; pas de réservation de sa propre annonce ; compte
  suspendu refusé.
- La demande ouvre la conversation dans la messagerie (message
  automatique + message du voyageur) : l'hôte peut répondre malgré la règle
  anti-démarchage, et le contact entre dans son suivi (lead).
- Annulation jusqu'au jour d'arrivée : le voyageur (demande ou réservation
  acceptée), l'hôte (réservation acceptée, motif obligatoire). Les nuits se
  libèrent aussitôt.
- Notifications : `reservation_demandee` (hôte), `reservation_acceptee`,
  `reservation_refusee`, `reservation_annulee` → page `/reservations`.
- Une demande sans réponse dont la date d'arrivée est passée s'affiche
  « Expirée » (aucune tâche planifiée pour l'instant).

## Écrans
- Accueil : onglet **Séjour** de la recherche (commune, calendrier deux
  mois, voyageurs).
- Recherche : bouton « Séjour court », dates et voyageurs dans les filtres ;
  la base ne renvoie que les annonces libres sur toutes les nuits ; prix
  « / nuit » (« dès » pour un hôtel) ; dates transmises à la fiche.
- Fiche : carte de réservation (`ReservationSejour`) — type de chambre,
  calendrier avec nuits complètes barrées (`nuits_completes_keyli`),
  voyageurs, chambres, devis de la base, message à l'hôte.
- `/reservations` : « Mes séjours » (tous) et « Demandes reçues »
  (propriétaires, agences) — accepter, refuser (motif facultatif), annuler.
- Publication : case « Séjour court » (imposée pour hôtel/auberge), nuits
  minimum, voyageurs maximum ; Mes annonces → « Chambres »
  (`GestionChambres`) pour les hôtels et auberges.

## Limites connues / suite
- Pas de paiement en ligne ni d'acompte (décision du porteur).
- Pas de blocage manuel de dates par l'hôte (réservations prises hors
  Keyli) : il refuse les demandes concernées. À ajouter si le besoin se
  confirme (table de blocages comptée dans `occupation_sejour_keyli`).
- Prix identique toutes les nuits (pas de tarif week-end / saison).
- Pas d'expiration automatique des demandes sans réponse (pg_cron possible).
- Mobile : la carte de réservation est sous la description ; une barre
  « Réserver » fixe en bas d'écran serait plus confortable.
