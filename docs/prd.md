# PRD Keyli — copie markdown pour lecture par Claude Code

> Copie texte du PRD officiel (Keyli_PRD_v1.5.docx), pour que Claude Code
> puisse le lire directement sans parseur docx. En cas de divergence de
> mise en forme entre les deux, **le .docx fait foi** pour la présentation ;
> ce fichier fait foi pour le contenu texte, identique aux deux. Ne pas
> modifier ce fichier indépendamment du .docx — les deux doivent rester
> synchronisés si le PRD évolue.

---

**KEYLI**

Plateforme immobilière de confiance — Afrique de l'Ouest

**PRD — Product Requirements Document**

Web · iOS · Android (React Native)

Fiacre Nguessan — Fondateur, Nguessan-IT

Version 1.5 — Juillet 2026

Sommaire

## 1. Résumé exécutif

Keyli est une plateforme immobilière destinée à l'Afrique de l'Ouest, dont la promesse centrale est la confiance : vérification des acteurs (propriétaires, agences), notation des transactions et mise en avant des annonces contrôlées. L'ambition du produit dépasse le site web actuel : Keyli doit exister nativement sur Web, iOS et Android avec une expérience homogène et une base technique partagée.

Le marché immobilier ouest-africain, et ivoirien en particulier, souffre d'un déficit structurel de confiance : annonces fictives, doubles locations, absence de vérification documentaire, litiges non arbitrés. Keyli répond à ce problème par la vérification et la réputation plutôt que par le simple volume d'annonces.

Vision à long terme (au-delà de ce PRD)

**L'ambition de fond est de faire de Keyli une plateforme de référence pour la réservation de logement à l'international, sur le modèle des applications occidentales de réservation (type Airbnb/Booking), en couvrant à terme logements, hôtels et auberges, avec disponibilité par dates d'entrée et de fin de séjour. Cette évolution suppose un changement de modèle fonctionnel significatif (calendrier de disponibilité, réservation par plage de dates, inventaire hôtelier) par rapport à la mise en relation vérifiée qui constitue le cœur du produit v1 — elle n'est pas traitée dans le présent document et est explicitement hors périmètre v1 (voir section 5.2 et 12.1). Le focus marketing et commercial reste local (Côte d'Ivoire) pour la durée couverte par ce PRD ; l'ambition sous-régionale/internationale est un objectif de fond à rappeler dans la documentation produit, pas un engagement de calendrier.**

Objectifs de ce document

-   Définir la vision produit complète de Keyli, indépendamment de l'implémentation déjà existante.

-   Fixer le périmètre fonctionnel commun et spécifique aux trois plateformes (Web, iOS, Android).

-   Servir de référence unique pour les décisions de priorisation, de roadmap et d'architecture.

-   Documenter les hypothèses et décisions encore ouvertes, à trancher par le fondateur.

## 2. Contexte et problème à résoudre

### 2.1 Constat marché

-   Forte informalité du marché locatif et de la vente immobilière en Côte d'Ivoire et en Afrique de l'Ouest.

-   Multiplication des arnaques : annonces fictives, faux mandataires, doubles encaissements de caution.

-   Absence de mécanisme de réputation : un propriétaire ou agent malhonnête peut opérer sans conséquence.

-   Fragmentation de l'offre entre réseaux informels (WhatsApp, Facebook) et plateformes non vérifiées.

### 2.2 Conséquences pour les utilisateurs

-   Locataires/acheteurs : perte financière, perte de temps, méfiance généralisée envers les plateformes en ligne.

-   Propriétaires/agences sérieux : dilués parmi des annonces frauduleuses, difficulté à se différencier.

### 2.3 Positionnement Keyli

Keyli ne cherche pas à être la plateforme avec le plus d'annonces, mais celle où chaque annonce et chaque acteur peuvent être vérifiés. La confiance est la fonctionnalité produit, pas un argument marketing accessoire.

## 3. Marché cible et personas

### 3.1 Marché

-   Marché primaire : Abidjan (phase pilote), Côte d'Ivoire.

-   Marché secondaire (roadmap) : expansion aux autres grandes villes ivoiriennes, puis à l'Afrique de l'Ouest francophone (Sénégal, Bénin, Togo — à confirmer).

### 3.2 Personas

  ————————-- ———————————————————— ————————————————————— —————————-
  **Persona**                **Profil**                                                   **Besoin principal**                                            **Plateforme prioritaire**

  Locataire / Acheteur       Particulier urbain, mobile-first, budget contraint à moyen   Trouver un logement fiable rapidement, éviter les arnaques      Mobile

  Propriétaire particulier   Possède 1 à 3 biens, peu digitalisé                          Louer/vendre vite, sans se faire piéger par un locataire        Mobile + Web

  Agence immobilière         Professionnel, plusieurs dizaines de biens                   Gérer un portefeuille, prouver son sérieux, générer des leads   Web (back-office) + Mobile

  Administrateur Keyli       Équipe interne Nguessan-IT / Keyli                           Vérifier les documents, modérer, suivre les KPIs pilote         Web uniquement
  ————————-- ———————————————————— ————————————————————— —————————-

## 4. Objectifs produit et indicateurs de succès

### 4.1 Objectifs

-   Devenir la référence de confiance pour la recherche et la publication de biens immobiliers à Abidjan.

-   Atteindre une masse critique d'annonces vérifiées permettant un effet de réseau (section « Logements de Confiance »).

-   Convertir l'usage web pilote en usage mobile natif majoritaire, cohérent avec les habitudes de connexion en Afrique de l'Ouest (mobile-first, données limitées).

### 4.2 KPIs de succès

  —————————————— —————————-- ———————————--
  **Indicateur**                             **Cible pilote (0-6 mois)**   **Cible post-pilote (6-18 mois)**

  Annonces actives vérifiées                 500 (panel pilote)            5 000+

  Taux de vérification propriétaires         ≥ 70 %                        ≥ 85 %

  Note moyenne des transactions              ≥ 4.0 / 5                     ≥ 4.2 / 5

  Taux d'installation mobile / visite web   N/A (web only)                ≥ 40 %

  Taux de conversion annonce → contact       À mesurer (baseline)          +20 % vs baseline
  —————————————— —————————-- ———————————--

## 5. Périmètre produit

### 5.1 Dans le périmètre

-   Application Web responsive (navigateur desktop et mobile).

-   Application mobile native iOS et Android via React Native, partageant la logique métier et les appels API avec le Web autant que possible.

-   Back-office d'administration (Web uniquement).

-   Intégrations tierces : paiement (Paystack), média (Cloudinary), messagerie externe (WhatsApp Business), recherche en langage naturel (IA).

### 5.2 Hors périmètre (v1)

-   Paiement intégral de transaction immobilière (loyer, achat) via la plateforme — Keyli facilite la mise en relation vérifiée, ne gère pas l'escrow au lancement.

-   Expansion multi-pays au-delà de la Côte d'Ivoire.

-   Application desktop native (macOS/Windows) — le Web couvre cet usage.

-   Réservation par calendrier de disponibilité (dates d'entrée/de fin), inventaire hôtelier/auberge — relève de la vision long terme (voir Résumé exécutif et section 12.1), pas du produit v1.

### 5.3 Spécificités par plateforme

  ———————————————- ———————-- ————————————
  **Fonctionnalité**                             **Web**                 **Mobile (iOS/Android)**

  Recherche et consultation d'annonces          Oui                     Oui

  Publication d'annonce                         Oui                     Oui — avec capture photo native

  Back-office admin / modération                 Oui                     Non

  Dashboard propriétaire (analytics)             Oui (complet)           Oui (vue simplifiée)

  Notifications push temps réel                  Non (web push limité)   Oui — natif

  Vérification documentaire (upload pièce)       Oui                     Oui — avec appareil photo + scan

  Mode hors-ligne (consultation)                 Limité (cache PWA)      Oui — cache natif renforcé

  Géolocalisation continue / alertes proximité   Non                     Oui
  ———————————————- ———————-- ————————————

## 6. Parcours utilisateurs clés

### 6.1 Recherche et contact (Locataire/Acheteur)

-   Ouverture de l'app → recherche par filtre ou recherche en langage naturel (IA).

-   Consultation d'une annonce → badge de confiance visible (vérifié / note moyenne).

-   Contact du propriétaire via messagerie interne ou WhatsApp Business.

-   Après visite/transaction → notation de l'expérience.

### 6.2 Publication d'annonce (Propriétaire / Agence)

-   Inscription et vérification d'identité (pièce + registre de commerce pour agence).

-   Paiement de l'abonnement (propriétaire ou agence).

-   Création d'annonce : photos, description, avantages/proximités, localisation carte.

-   Suivi des performances via dashboard (vues, contacts, taux de conversion).

### 6.3 Vérification et modération (Admin)

-   Réception d'une demande de vérification documentaire.

-   Contrôle des pièces et validation/rejet.

-   Suivi des signalements et gestion des litiges de notation.

## 7. Exigences fonctionnelles

Priorisation MoSCoW : Must (indispensable v1), Should (important, peut suivre de près), Could (valeur ajoutée, non bloquant).

### 7.1 Authentification et comptes

  —————————————- —————————————————————————- ————--
  **Exigence**                             **Détail**                                                                   **Priorité**

  Inscription / connexion                  Email + mot de passe, avec indicateur de robustesse du mot de passe          Must

  Rôles utilisateurs                       Locataire/Acheteur, Propriétaire, Agence, Admin — permissions distinctes   Must

  Vérification d'email                    Confirmation obligatoire avant publication d'annonce                        Must

  Connexion sociale (Google)               Réduction de friction à l'inscription                                       Should

  Biométrie mobile (Face ID / empreinte)   Connexion rapide sur mobile natif                                            Could
  —————————————- —————————————————————————- ————--

### 7.2 Catalogue et recherche

  —————————————- ————————————————————————————————————————————————————————————————————————————- ————————————————
  **Exigence**                             **Détail**                                                                                                                                                                                                                            **Priorité**

  Filtres avancés                          Prix, type de bien, quartier, nombre de pièces, avantages/proximités                                                                                                                                                                  Must

  Recherche en langage naturel (IA)        Requête libre traduite en filtres structurés                                                                                                                                                                                          Should

  Carte interactive                        Localisation des biens, recherche par zone                                                                                                                                                                                            Must

  Section Logements de Confiance           Biens vérifiés avec note ≥ 4.0                                                                                                                                                                                                        Must

  Alertes de recherche sauvegardée         Notification sur nouvelle annonce correspondant aux critères                                                                                                                                                                          Should

  Quartiers tendance (popularité + prix)   Suivi des recherches par quartier et des prix publiés, pour alimenter les quartiers mis en avant sur l'Accueil et le TrendBar du dashboard Chercheur — source de données unique pour les deux, pas deux fonctionnalités séparées   Should — spécification technique à détailler
  —————————————- ————————————————————————————————————————————————————————————————————————————- ————————————————

### 7.3 Vérification et confiance

  —————————————- —————————————————— ————--
  **Exigence**                             **Détail**                                             **Priorité**

  Vérification documentaire propriétaire   Pièce d'identité, ACD ou titre équivalent             Must

  Vérification agence                      Registre de commerce                                   Must

  Badge « Vérifié »                        Affiché sur profil et annonces                         Must

  Système de notation bidirectionnel       Locataire note propriétaire et inversement             Must

  Signalement d'annonce/abus              Formulaire de signalement + file de modération admin   Must
  —————————————- —————————————————— ————--

### 7.4 Paiements et abonnements

  ——————————————- —————————————————————— ————--
  **Exigence**                                **Détail**                                                         **Priorité**

  Abonnement propriétaire                     Accès à la publication d'annonces, paiement récurrent             Must

  Abonnement utilisateur premium              Accès à des fonctionnalités avancées (alertes, contact illimité)   Should

  Intégration paiement mobile money / carte   Via Paystack ou équivalent local                                   Must

  Gestion des expirations et relances         Notification avant expiration, blocage à échéance                  Must
  ——————————————- —————————————————————— ————--

### 7.5 Messagerie et notifications

  —————————-- ————————————————————- —————
  **Exigence**                  **Détail**                                                    **Priorité**

  Messagerie interne            Conversation liée à une annonce                               Must

  Widget WhatsApp Business      Contact direct alternatif                                     Should

  Notifications push (mobile)   Nouveau message, statut vérification, expiration abonnement   Must (mobile)

  Notifications email           Fallback pour utilisateurs web / hors app                     Should
  —————————-- ————————————————————- —————

### 7.6 Back-office administrateur (Web uniquement)

  ——————————— ————————————— ————--
  **Exigence**                      **Détail**                              **Priorité**

  File de vérification              Validation/rejet des documents soumis   Must

  Dashboard analytics global        Suivi KPIs plateforme et panel pilote   Must

  Journal d'audit                  Traçabilité des actions admin           Should

  Gestion des templates marketing   WhatsApp, Facebook, Instagram           Could
  ——————————— ————————————— ————--

## 8. Exigences non-fonctionnelles

### 8.1 Sécurité et conformité

-   Row-Level Security sur toutes les données sensibles (documents, transactions, messages).

-   Chiffrement des documents d'identité au repos et en transit.

-   Séparation stricte des clés publiques (client) et privées (serveur uniquement, jamais exposées côté app).

-   Limite de taille et de format imposée à tout upload de document (Supabase Storage) — rejet côté serveur, pas uniquement côté interface, pour éviter le contournement.

-   Conformité aux exigences locales de protection des données personnelles.

### 8.2 Performance et disponibilité

-   Temps de chargement initial \< 3 secondes sur connexion mobile 3G/4G standard en Côte d'Ivoire.

-   Disponibilité cible : 99.5 % hors maintenance planifiée.

-   Compression et optimisation automatique des images (déjà en place via Cloudinary, à conserver sur mobile).

### 8.3 Expérience mobile spécifique

-   Mode hors-ligne pour la consultation des annonces déjà vues (cache local).

-   Consommation de données optimisée — public cible sensible au coût data.

-   Respect des guidelines Apple (App Store) et Google (Play Store) pour la soumission et la review.

### 8.4 Accessibilité et localisation

-   Interface en français (langue principale).

-   Structure permettant l'ajout ultérieur de langues locales ou de l'anglais pour l'expansion régionale.

-   Contrastes et tailles de police conformes aux standards d'accessibilité mobile de base.

## 9. Architecture technique cible

### 9.1 Principe directeur

Maximiser le partage de code et de logique métier entre Web et Mobile pour limiter la duplication d'effort et garantir la cohérence fonctionnelle entre plateformes.

### 9.2 Web

-   Frontend : React + TypeScript, Vite, TailwindCSS, Shadcn/ui.

-   Gestion d'état serveur : React Query.

-   Cartographie : Mapbox / Google Maps.

### 9.3 Mobile (iOS / Android)

-   Framework : React Native — réutilisation maximale de la logique métier TypeScript existante côté web (hooks, appels API, validation).

-   Navigation et composants UI natifs adaptés (pas de simple wrapper web).

-   Modules natifs nécessaires : caméra (vérification documents), notifications push, géolocalisation.

### 9.4 Backend commun (Web + Mobile)

-   Supabase : base de données PostgreSQL, authentification, Row-Level Security, Edge Functions.

-   Projet Supabase dédié et isolé à Keyli — aucune coexistence avec les tables d'autres projets clients Nguessan-IT. L'isolation se fait au niveau du projet (instance Postgres séparée), pas au niveau des clés API.

-   Cloudinary : stockage et optimisation des photos et vidéos liées aux annonces.

-   Supabase Storage : stockage des documents de vérification (pièce d'identité, registre de commerce, ACD), avec limite de taille de fichier appliquée à l'upload pour prévenir les abus et maîtriser les coûts de stockage. Seuil précis à définir (recommandation de départ : 5 à 10 Mo par fichier, format PDF/JPEG/PNG uniquement).

-   Paystack : paiements et abonnements.

-   Recherche IA : modèle de langage pour la recherche en langage naturel.

### 9.5 Schéma d'intégration

Le backend Supabase et les Edge Functions constituent la couche unique servant indifféremment le Web et les apps mobiles, garantissant une seule source de vérité pour les données, les règles de sécurité et la logique métier critique (paiements, vérification).

## 10. Modèle de données (vue d'ensemble)

  ————————— —————————————————————————————————————————
  **Entité**                  **Rôle**

  Profils utilisateurs        Identité, rôle, statut de vérification

  Propriétés / Annonces       Biens publiés, statut pilote, avantages/proximités — médias (photos/vidéos) hébergés sur Cloudinary

  Documents de vérification   Pièces soumises pour contrôle d'identité/registre — fichiers hébergés sur Supabase Storage, taille limitée à l'upload

  Abonnements                 Statut et échéance des abonnements propriétaires/utilisateurs

  Transactions                Historique des paiements

  Messages                    Conversations liées aux annonces

  Notations / Avis            Évaluations bidirectionnelles

  Signalements                Abus et litiges à traiter par l'administration
  ————————— —————————————————————————————————————————

## 11. Modèle économique

### 11.1 Grille tarifaire propriétaires et agences (définitive)

Le prix évolue avec le volume d'annonces, pas avec le type de compte affiché — un propriétaire et une agence paient le même tarif à volume égal. Le type de compte (vérification identité vs registre de commerce) détermine l'éligibilité au forfait, pas un tarif différencié arbitraire.

  —————- ——————————————- ———————-- —————— ————————————————————
  **Forfait**      **Cible**                                   **Annonces incluses**   **Prix mensuel**   **Règle de dépassement**

  Propriétaire     Particulier, 1 à 4 biens                    Jusqu'à 4              5 000 XOF          Facturation à l'unité par annonce supplémentaire

  Agence Moyenne   Petite agence, portefeuille en croissance   5 à 10                  15 000 XOF         Au-delà de 10, passage recommandé au forfait Grande Agence

  Grande Agence    Agence établie, plusieurs agents            Au-delà de 10           25 000 XOF         Très grand volume : tarif négocié sur devis
  —————- ——————————————- ———————-- —————— ————————————————————

### 11.2 Règles transversales

-   Une annonce active et publiée compte dans le seuil — une annonce archivée puis republiée compte comme nouvelle, pour empêcher la remise à zéro artificielle du compteur.

-   Le type de compte vérifié (identité pour propriétaire, registre de commerce pour agence) verrouille l'accès au forfait — un compte agence ne peut pas s'inscrire au forfait Propriétaire, y compris s'il publie peu d'annonces.

-   La facturation de dépassement est prélevée au même cycle que l'abonnement, pas via une facture séparée par annonce.

-   Un compte qui dépasse durablement son seuil (2 mois consécutifs) reçoit une recommandation explicite de montée de gamme plutôt que de payer indéfiniment du dépassement.

-   Cycle de facturation : mensuel uniquement en v1. Un palier trimestriel/annuel avec remise est une piste pour une version future, une fois les seuils et prix stabilisés par les données du pilote — introduire un engagement long terme sur une grille encore appelée à changer pénaliserait les premiers clients pilotes.

### 11.3 Côté chercheur (locataire/acheteur) — décision explicite

Aucun paywall côté chercheur en v1. La mise en relation (messagerie interne et coordonnées de contact) reste gratuite pour les chercheurs : les propriétaires et agences paient déjà pour être vus et contactés, faire payer également la demande réduirait mécaniquement le nombre de contacts reçus — contradiction directe avec la valeur vendue à l'offre.

**Piste explicitement différée, à concevoir uniquement à partir des données réelles d'usage du pilote (taux de contact, comportement de recherche) plutôt que par anticipation : un modèle payant côté chercheur (ex. accès prioritaire aux coordonnées, alertes premium) pourra être réévalué en version future, une fois ces données disponibles.**

## 12. Roadmap et phasage

  ——————————— —————————————————————————— —————--
  **Phase**                         **Contenu**                                                                    **Plateformes**

  Phase 1 — Pilote                Validation du modèle de confiance sur panel de 500 propriétés à Abidjan        Web

  Phase 2 — Consolidation         Ouverture du marché grand public à Abidjan, optimisation conversion            Web

  Phase 3 — Mobile natif          Lancement iOS/Android en React Native, parité fonctionnelle cœur avec le Web   Web + Mobile

  Phase 4 — Expansion nationale   Extension aux autres grandes villes de Côte d'Ivoire                          Web + Mobile

  Phase 5 — Expansion régionale   Évaluation de marchés ouest-africains additionnels                             Web + Mobile
  ——————————— —————————————————————————— —————--

### 12.1 Au-delà de la phase 5 — ambition long terme

Objectif de fond à rappeler dans la documentation produit, non calendarisé dans les phases ci-dessus : faire de Keyli la plateforme de référence pour la réservation de logement en Côte d'Ivoire, voire dans la sous-région ouest-africaine, à l'image des applications occidentales de réservation, en couvrant logements, hôtels et auberges avec disponibilité par dates de séjour (entrée/fin de bail ou de séjour).

-   Le moment opportun pour encourager les propriétaires et agences à renseigner la disponibilité de leurs biens (dates d'entrée/fin) sera étudié au fil des évolutions du produit, pas décidé par anticipation.

-   Le focus marketing et commercial reste local (Côte d'Ivoire) tant que cette évolution n'est pas engagée — ce n'est pas une contradiction avec l'ambition sous-régionale/internationale, seulement un séquencement délibéré.

## 13. Risques et dépendances

  ———————————————-- ———————————————————- ————————————————————————
  **Risque**                                      **Impact**                                                 **Mitigation**

  Adoption mobile plus lente que prévu            Retour sur investissement du développement natif retardé   Lancer le mobile seulement après traction web confirmée en pilote

  Dépendance à Paystack / Cloudinary / Supabase   Interruption de service tierce = interruption Keyli        Contrats de niveau de service, plan de contingence par fournisseur

  Review App Store / Play Store                   Délai ou rejet de publication mobile                       Anticiper les guidelines dès la conception UI mobile

  Fraude documentaire à la vérification           Atteinte directe à la promesse de confiance du produit     Contrôle humain systématique en plus de toute vérification automatisée
  ———————————————-- ———————————————————- ————————————————————————

### 13.1 Focus stockage et base de données (Supabase)

Le projet dépend d'un unique fournisseur (Supabase) pour la base de données, l'authentification et le stockage des documents de vérification — une concentration qui mérite une réflexion dédiée plutôt que d'être noyée dans le tableau général ci-dessus.

  ———————————————————————————-- ————————————————————————————————————————————————————— ———————————————————————————————————————————————————-
  **Risque**                                                                          **Impact**                                                                                                                                                      **Mitigation**

  Concentration base de données + auth + documents sur un seul fournisseur            Un incident Supabase (panne, changement de conditions, dépassement de quota) affecte simultanément la connexion, les données et les documents de vérification   Sauvegardes régulières exportées hors Supabase (dump Postgres périodique stocké séparément) ; procédure de restauration testée avant le lancement public

  Absence de stratégie de sauvegarde/reprise après sinistre formalisée                Perte de données réelles d'utilisateurs (annonces, vérifications, transactions) en cas d'incident majeur                                                      Définir un objectif de point de reprise (RPO) et de temps de reprise (RTO) avant la fin de la phase 0 du calendrier de développement, pas après

  Croissance du volume de documents de vérification (pièces d'identité, registres)   Coût de stockage Supabase qui augmente avec le nombre d'utilisateurs vérifiés, à un rythme non encore mesuré                                                   Suivre le coût par utilisateur vérifié dès le pilote pour projeter le coût à l'échelle avant l'expansion nationale (phase 4)

  Verrouillage fournisseur (vendor lock-in)                                           Migration vers un autre backend serait coûteuse une fois le volume de données réel en production                                                                Garder les migrations SQL versionnées et le schéma documenté (déjà le cas) pour limiter, sans l'éliminer, le coût d'une migration future
  ———————————————————————————-- ————————————————————————————————————————————————————— ———————————————————————————————————————————————————-

13.2 Média : Cloudinary évalué face à Firebase Storage (décision — juillet 2026)

Firebase Storage a été envisagé pour remplacer Cloudinary sur l'hypothèse d'un coût de stockage plus faible. Vérification faite, cette hypothèse ne tient pas en l'état (informations vérifiées en juillet 2026, à revérifier si cette décision est rouverte plus tard — le pricing cloud change vite) :

-   Depuis les changements Google de fin 2024/février 2026, la création d'un bucket Firebase Storage nécessite désormais le plan payant Blaze — il n'y a plus de palier de stockage gratuit par défaut pour un nouveau projet.

-   Le palier « Always Free » restant ne s'applique qu'à des régions hébergées aux États-Unis, sans pertinence géographique pour un produit centré sur Abidjan.

-   Firebase/Google Cloud n'a pas de plafond de dépense strict par défaut — seulement des alertes après coup — ce qui expose à un risque de facturation incontrôlée, documenté par des cas réels de factures de plusieurs dizaines de milliers de dollars suite à un usage mal borné.

-   Firebase Storage est un stockage brut, sans transformation ni optimisation d'image/vidéo à la volée — remplacer Cloudinary par Firebase reviendrait à perdre cette fonctionnalité, pas à la déplacer, sauf à construire un pipeline de transformation maison.

**Décision : Cloudinary est maintenu. Son palier gratuit (25 crédits/mois, sans carte bancaire, suspension plutôt que facturation surprise en cas de dépassement) reste adapté à la phase pilote. Si un besoin de stockage brut moins coûteux émerge à l'échelle, Cloudflare R2 (compatible S3, sans frais de sortie de bande passante) est une piste plus cohérente que Firebase — à évaluer uniquement en complément de Cloudinary, pas en remplacement des transformations.**

## 14. Hypothèses et décisions ouvertes

Points à trancher explicitement par le fondateur avant ou pendant le développement — ce PRD ne les tranche pas à sa place :

-   Calendrier précis de lancement de la phase mobile par rapport à la phase pilote web.

-   Modèle payant côté chercheur (voir section 11.3) — volontairement différé jusqu'à disposer de données réelles d'usage du pilote.

-   Villes et pays visés pour les phases d'expansion 4 et 5, et calendrier associé.

-   Ressources de développement mobile : recrutement, prestataire externe, ou montée en compétence interne sur React Native.

-   Politique de gestion des litiges (au-delà du signalement) — arbitrage humain, remboursement, exclusion de la plateforme.

-   Algorithme de quartiers tendance (section 7.2) — mécanisme de tracking des recherches et de calcul des tendances de prix à spécifier en détail dans la documentation dédiée à Claude Code, une fois le modèle de documentation fourni.

## 15. Annexe — Glossaire

  —————-- ——————————————————————————————-
  **Terme**         **Définition**

  ACD               Attestation de Concession Définitive — document foncier ivoirien

  RLS               Row-Level Security — sécurité au niveau ligne dans la base de données

  MoSCoW            Méthode de priorisation Must / Should / Could / Won't

  Panel pilote      Ensemble contrôlé de propriétés utilisées pour valider le modèle avant ouverture publique
  —————-- ——————————————————————————————-
