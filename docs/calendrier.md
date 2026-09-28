# Calendrier Keyli — copie markdown pour lecture par Claude Code

> Copie texte du calendrier définitif (Keyli_Calendrier_Definitif.docx).
> Voir aussi `docs/INSTRUCTIONS_PAR_SEMAINE.md` pour un format copiable-collable
> semaine par semaine, dérivé de ce calendrier. Ne pas modifier ce fichier
> indépendamment du .docx — les deux doivent rester synchronisés.

---

**KEYLI**

**Calendrier de Développement — Web & Mobile**

React / TypeScript / Supabase (Web) — React Native (iOS · Android)

Développement solo assisté par Claude Code

Nguessan-IT — Fiacre Nguessan, Fondateur

Version 2.0 — Juillet 2026 — Horizon ~20 mois (consolidé)

Sommaire

## 1. Principe fondateur du calendrier

+————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————+
| **Solo + Claude Code : ce que ça change réellement**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Ce calendrier n'est pas un simple raccourcissement d'un plan pensé pour 5 personnes. Claude Code compresse fortement le temps d'écriture de code, de tests unitaires et de documentation — c'est là que le gain est réel. En revanche, il ne compresse pas : la review App Store/Play Store (délai fixe, hors de notre contrôle), les retours du panel pilote (500 propriétaires ne répondent pas plus vite), la décision produit (une seule tête, pas de parallélisation entre plusieurs devs), et les tâches non techniques (négociation partenaires, support utilisateur, KYC manuel). Les durées ci-dessous reflètent cette réalité : compression forte sur les tâches de code, aucune compression sur les tâches à horloge externe. |
+————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————+

Ce calendrier reprend le format du modèle de référence (vue d'ensemble des phases, puis sprints détaillés avec contexte, objectifs, tâches et livrables), mais son contenu est spécifique à Keyli. Il répond également à un point laissé ouvert dans le PRD (section 14) : le calendrier précis de la phase mobile par rapport au pilote web.

Pour rester exploitable, seul le premier sprint de chaque phase est détaillé au niveau tâche par tâche (le standard à suivre). Les sprints suivants sont donnés sous forme de tableau objectifs/livrables — à détailler au même niveau sur demande, sprint par sprint, au moment de les démarrer.

## 2. Vue d'ensemble — ~20 mois, 5 phases

  ————————————————- —————-- ———-- ————————————————————————————————————— ———————————————————————————--
  **Phase**                                         **Période**       **Durée**   **Contenu principal**                                                                                           **Jalon de succès**

  Phase 0 — Fondations                            Semaines 1-3      3 sem.      Projet Supabase dédié, durcissement sécurité, CI/CD                                                             Environnement isolé et sécurisé opérationnel

  Phase 1 — Finalisation Web & Lancement Pilote   Semaines 4-25     22 sem.     Parcours complets, dashboards enrichis (Agence/Propriétaire/Chercheur), back-office, lancement pilote Abidjan   500 propriétés, dashboards agence opérationnels, 1er cycle de transactions notées

  Phase 2 — Consolidation                         Semaines 26-37    12 sem.     Ouverture grand public, optimisation conversion, prépa mobile                                                   Marché Abidjan ouvert, base de code partageable prête

  Phase 3 — Mobile React Native                   Semaines 38-58    21 sem.     App iOS/Android complète, tests bêta, publication stores                                                        Apps publiées sur App Store et Play Store

  Phase 4 — Expansion nationale                   Semaines 59-71    13 sem.     Extension autres villes de Côte d'Ivoire                                                                       Présence multi-villes stabilisée

  Phase 5 — Expansion régionale                   Semaines 72-87+   16+ sem.    Évaluation marchés ouest-africains, localisation                                                                Décision argumentée d'expansion pays
  ————————————————- —————-- ———-- ————————————————————————————————————— ———————————————————————————--

+—————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————+
| **Ce calendrier consolide deux documents antérieurs**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Ce document fusionne le Calendrier de Développement (18 mois) et le Calendrier de Codage Prioritaire (dashboards enrichis, 9 semaines) qui existaient jusqu'ici séparément. Le choix retenu : décaler la Phase 1 plutôt que d'absorber ce travail dans la marge de la Phase 2. Raison : les agences payantes (forfaits 15 000 / 25 000 XOF) ont besoin d'un dashboard agence fonctionnel dès l'onboarding du pilote, pas après — le proposer en Phase 2 aurait fait payer des agences pour un outil encore incomplet pendant toute la durée du pilote. Conséquence assumée : le calendrier total passe de 18 à environ 20 mois. |
+—————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————+

## 3. Phase 0 — Fondations (Semaines 1-3)

+————————————————————————————————————————————————————————————————————————————————————————————————————————————————————--+
| **Pourquoi cette phase d'abord**                                                                                                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                                                                                              |
| Le web Keyli existe déjà, mais il partage aujourd'hui un projet Supabase avec d'autres clients Nguessan-IT — décision déjà actée à corriger avant toute nouvelle fonctionnalité. Construire sur une base non isolée serait irresponsable, et corriger après le lancement pilote serait bien plus coûteux (migration de données réelles d'utilisateurs). |
+————————————————————————————————————————————————————————————————————————————————————————————————————————————————————--+

+—————————————————————————————————————————————————————————————————————————————————————————————————--+
| **Phase 0 \| Semaines 1-3**                                                                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                                                                                     |
| **Sprint 0 — Isolation Supabase & durcissement**                                                                                                                                                                                                                                                  |
|                                                                                                                                                                                                                                                                                                     |
| **Contexte et justification**                                                                                                                                                                                                                                                                       |
|                                                                                                                                                                                                                                                                                                     |
| Avant d'ouvrir le pilote à de vrais propriétaires et locataires, l'environnement doit être isolé, sécurisé et testable. C'est la seule phase du calendrier consacrée entièrement à l'infrastructure plutôt qu'à des fonctionnalités visibles — investissement invisible mais non négociable. |
|                                                                                                                                                                                                                                                                                                     |
| **Objectifs du sprint**                                                                                                                                                                                                                                                                             |
|                                                                                                                                                                                                                                                                                                     |
| -   Projet Supabase dédié à Keyli créé et isolé de tout autre projet client                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                                                                                     |
| -   Row-Level Security ré-auditée et validée sur toutes les tables                                                                                                                                                                                                                                  |
|                                                                                                                                                                                                                                                                                                     |
| -   Limite de taille/format appliquée côté serveur sur les uploads de documents                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                                     |
| -   Pipeline CI/CD de base actif (lint, build, déploiement)                                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                                                                                     |
| **Tâches**                                                                                                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                                                                     |
| -   Création du nouveau projet Supabase et export du schéma (32 migrations existantes)                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                                     |
| -   Rejeu des migrations sur le nouveau projet, vérification table par table                                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                                                                                     |
| -   Réapplication et test de chaque policy RLS (profils, annonces, documents, transactions)                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                                                                                     |
| -   Migration des données réelles existantes du pilote, si déjà collectées                                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                                                                     |
| -   Mise à jour du .env et suppression de toute référence à l'ancien projet partagé                                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                                                                     |
| -   Ajout d'une validation serveur (Edge Function) sur la taille/format des documents uploadés                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                                     |
| -   Mise en place d'un pipeline CI basique (build + lint automatique à chaque push)                                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                                                                     |
| **Livrables et critères de validation**                                                                                                                                                                                                                                                             |
|                                                                                                                                                                                                                                                                                                     |
| -   Aucune table Keyli ne subsiste sur l'ancien projet partagé                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                                     |
| -   Toutes les policies RLS testées manuellement avec un compte de chaque rôle (locataire, propriétaire, agence, admin)                                                                                                                                                                             |
|                                                                                                                                                                                                                                                                                                     |
| -   Upload d'un fichier surdimensionné rejeté côté serveur, pas seulement côté interface                                                                                                                                                                                                           |
|                                                                                                                                                                                                                                                                                                     |
| -   Pipeline CI vert sur le premier commit post-migration                                                                                                                                                                                                                                           |
+—————————————————————————————————————————————————————————————————————————————————————————————————--+

## 4. Phase 1 — Finalisation Web & Lancement Pilote (Semaines 4-25)

+———————————————————————————————————————————————————————————————————————————-+
| **Objectif de phase**                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                  |
| Faire passer le web de « fonctionnel » à « prêt pour de vrais utilisateurs payants », construire les dashboards enrichis qui justifient le pricing par forfait, puis lancer et faire vivre le pilote Abidjan sur 500 propriétés. |
+———————————————————————————————————————————————————————————————————————————-+

+———————————————————————————————————————————————————————————-+
| **Phase 1 \| Semaines 4-6**                                                                                                                                                      |
|                                                                                                                                                                                  |
| **Sprint 1 — Parcours propriétaire/agence de bout en bout**                                                                                                                    |
|                                                                                                                                                                                  |
| **Contexte et justification**                                                                                                                                                    |
|                                                                                                                                                                                  |
| Le parcours propriétaire (vérification, abonnement, publication) est celui qui génère la confiance et le revenu — il doit être sans friction avant d'inviter le panel pilote. |
|                                                                                                                                                                                  |
| **Objectifs du sprint**                                                                                                                                                          |
|                                                                                                                                                                                  |
| -   Vérification documentaire fluide (upload, statut, relance)                                                                                                                   |
|                                                                                                                                                                                  |
| -   Abonnement et paiement Paystack fiables de bout en bout                                                                                                                      |
|                                                                                                                                                                                  |
| -   Publication d'annonce sans blocage technique                                                                                                                                |
|                                                                                                                                                                                  |
| **Tâches**                                                                                                                                                                       |
|                                                                                                                                                                                  |
| -   Tests manuels complets du parcours vérification (upload → validation admin → badge)                                                                                          |
|                                                                                                                                                                                  |
| -   Tests des scénarios d'échec de paiement Paystack (webhook manqué, carte refusée)                                                                                            |
|                                                                                                                                                                                  |
| -   Vérification de la gestion des expirations d'abonnement                                                                                                                     |
|                                                                                                                                                                                  |
| -   Correction des bugs bloquants identifiés                                                                                                                                     |
|                                                                                                                                                                                  |
| **Livrables et critères de validation**                                                                                                                                          |
|                                                                                                                                                                                  |
| -   Un propriétaire test complète vérification + abonnement + publication sans intervention manuelle                                                                             |
|                                                                                                                                                                                  |
| -   Tous les cas d'échec de paiement affichent un message clair, aucun état incohérent en base                                                                                  |
+———————————————————————————————————————————————————————————-+

Sprints suivants de la phase 1

  —————————————— ————-- ——————————————————————- ——————————————————————
  **Sprint**                                 **Semaines**   **Objectifs**                                                       **Livrables**

  Sprint 2 — Parcours locataire/acheteur   7-8            Recherche, contact, notation post-transaction sans friction         Parcours complet testé de bout en bout

  Sprint 3 — Back-office admin             9-10           File de vérification, modération, analytics de base opérationnels   Admin peut traiter une inscription pilote sans support technique
  —————————————— ————-- ——————————————————————- ——————————————————————

Sprints 3bis — Dashboards enrichis (Semaines 11-19)

+—————————————————————————————————————————————————————————————————————————————————————————————————————————————--+
| **Pourquoi ces 9 semaines viennent ici, pas en Phase 2**                                                                                                                                                                                                                                                                                |
|                                                                                                                                                                                                                                                                                                                                         |
| Les forfaits Agence Moyenne (15 000 XOF) et Grande Agence (25 000 XOF) n'ont de justification commerciale que si le dashboard agence livre réellement plus de valeur qu'un dashboard propriétaire basique. Onboarder des agences payantes en Phase 1 sans ce dashboard reviendrait à leur facturer un outil qui n'existe pas encore. |
+—————————————————————————————————————————————————————————————————————————————————————————————————————————————--+

  ————- ————————————————————————————- ———————————————————————————-
  **Semaine**   **Fichiers / contenu**                                                                **Livrable de fin de semaine**

  Sem. 11       dashboard-animations.css, useCountUp.ts                                               Fondations d'animation testées isolément

  Sem. 12       Sparkline.tsx, DonutChart.tsx, TrendBar.tsx                                           3 primitives visuelles fonctionnelles

  Sem. 13       DashboardSidebar.tsx, DashboardTopbar.tsx, KpiCard.tsx                                Shell + carte KPI complète avec compteur animé

  Sem. 14       VerificationStepper.tsx, InsightCard.tsx, AgendaList.tsx, MessagePreviewList.tsx      4 composites indépendants prêts à assembler

  Sem. 15       LeadCard.tsx, LeadPipeline.tsx, RecommendationCard.tsx, CompareTable.tsx              Composants spécifiques Agence et Chercheur terminés

  Sem. 16       OwnerDashboard.tsx enrichi, UserDashboard.tsx enrichi                                 Deux dashboards existants portés à la version enrichie, données réelles Supabase

  Sem. 17       AgencyDashboard.tsx (nouvelle page complète)                                          Dashboard agence fonctionnel de bout en bout, données réelles

  Sem. 18       Subscription.tsx adapté aux 3 forfaits + useSubscription.ts étendu                    Souscription et changement de forfait fonctionnels pour les 3 paliers

  Sem. 19       QA transverse : accessibilité, responsive, suppression des données de démonstration   Les 3 dashboards prêts pour l'onboarding du pilote
  ————- ————————————————————————————- ———————————————————————————-

*Détail fichier par fichier, ordre de dépendance et justification : voir Keyli_Calendrier_Codage_Prioritaire (contenu repris ici tel quel, document désormais fusionné dans ce calendrier).*

Suite et fin de la phase 1

  ———————————————- ————-- ——————————————————————————————- ————————————————————--
  **Sprint**                                     **Semaines**   **Objectifs**                                                                               **Livrables**

  Sprint 4 — Onboarding panel pilote           20-21          Recrutement et embarquement des 500 propriétés cibles, avec dashboards agence disponibles   500 propriétés actives ou en cours de vérification

  Sprint 5 — Lancement et suivi terrain        22-23          Ouverture effective du pilote, support réactif                                              Premières transactions notées, premiers retours utilisateurs

  Sprint 6 — Stabilisation pré-consolidation   24-25          Correction des problèmes réels remontés par le pilote                                       Taux de vérification propriétaires ≥ 70 % (cible PRD)
  ———————————————- ————-- ——————————————————————————————- ————————————————————--

## 5. Phase 2 — Consolidation (Semaines 26-37)

+———————————————————————————————————————————————————————————————————-+
| **Objectif de phase**                                                                                                                                                                                    |
|                                                                                                                                                                                                          |
| Passer du pilote contrôlé au marché grand public d'Abidjan, tout en préparant la base de code pour qu'elle soit réutilisable par le futur mobile — sans quoi la phase 3 recommencerait tout de zéro. |
+———————————————————————————————————————————————————————————————————-+

  —————————————————- ————-- ————————————————————————-- ————————————————————————
  **Sprint**                                           **Semaines**   **Objectifs**                                                              **Livrables**

  Sprint 7 — Ouverture grand public                  26-28          Levée des restrictions du pilote, ouverture au marché Abidjan              Plateforme accessible sans invitation

  Sprint 8 — Optimisation conversion                 29-30          Amélioration du taux annonce → contact (baseline du PRD)                   +20 % de conversion mesurée vs baseline pilote

  Sprint 9 — Fiabilisation paiements                 31-32          Relances d'expiration, gestion d'échecs, réconciliation                  Zéro abonnement expiré non détecté sur 2 semaines de test

  Sprint 10 — Extraction de la logique partageable   33-35          Isolement des hooks/services indépendants de l'UI web                     Couche métier identifiée et documentée pour réutilisation React Native

  Sprint 11-12 — Stabilisation pré-mobile            36-37          Revue de sécurité, nettoyage dette technique avant d'attaquer le mobile   Aucun bug bloquant connu, base de code stable
  —————————————————- ————-- ————————————————————————-- ————————————————————————

## 6. Phase 3 — Mobile React Native (Semaines 38-58)

+——————————————————————————————————————————————————————————————————+
| **Objectif de phase**                                                                                                                                                                                |
|                                                                                                                                                                                                      |
| Construire, tester et publier les applications iOS et Android, en réutilisant la logique métier déjà validée côté web (voir table de correspondance Web ↔ Mobile du répertoire de fichiers sources). |
+——————————————————————————————————————————————————————————————————+

+————————————————————————————————————————————————————————————————————————-+
| **Phase 3 \| Semaines 38-40**                                                                                                                                                                                           |
|                                                                                                                                                                                                                         |
| **Sprint 13 — Socle du projet mobile**                                                                                                                                                                                |
|                                                                                                                                                                                                                         |
| **Contexte et justification**                                                                                                                                                                                           |
|                                                                                                                                                                                                                         |
| Comme pour le web en phase 0, le mobile démarre par une fondation technique plutôt que par des écrans visibles — la navigation, l'authentification et le client Supabase partagé sont des prérequis à tout le reste. |
|                                                                                                                                                                                                                         |
| **Objectifs du sprint**                                                                                                                                                                                                 |
|                                                                                                                                                                                                                         |
| -   Projet React Native (Expo) initialisé et connecté au projet Supabase Keyli                                                                                                                                          |
|                                                                                                                                                                                                                         |
| -   Navigation de base (stack + tabs) en place                                                                                                                                                                          |
|                                                                                                                                                                                                                         |
| -   Authentification fonctionnelle sur mobile                                                                                                                                                                           |
|                                                                                                                                                                                                                         |
| **Tâches**                                                                                                                                                                                                              |
|                                                                                                                                                                                                                         |
| -   Initialisation du projet Expo, configuration TypeScript alignée sur le web                                                                                                                                          |
|                                                                                                                                                                                                                         |
| -   Réutilisation directe de src/integrations/supabase/client.ts et des types générés                                                                                                                                   |
|                                                                                                                                                                                                                         |
| -   Mise en place de la navigation (React Navigation) reflétant les routes principales du web                                                                                                                           |
|                                                                                                                                                                                                                         |
| -   Implémentation de l'écran d'authentification (connexion/inscription)                                                                                                                                              |
|                                                                                                                                                                                                                         |
| -   Configuration du stockage sécurisé du token (Keychain iOS / Keystore Android)                                                                                                                                       |
|                                                                                                                                                                                                                         |
| **Livrables et critères de validation**                                                                                                                                                                                 |
|                                                                                                                                                                                                                         |
| -   Connexion/déconnexion fonctionnelle sur simulateur iOS et Android                                                                                                                                                   |
|                                                                                                                                                                                                                         |
| -   Navigation entre 3 écrans de base sans erreur                                                                                                                                                                       |
|                                                                                                                                                                                                                         |
| -   Token stocké de façon sécurisée, persistant après fermeture de l'app                                                                                                                                               |
+————————————————————————————————————————————————————————————————————————-+

Sprints suivants de la phase 3

  ———————————————— ————-- ——————————————————————- —————————————————————--
  **Sprint**                                       **Semaines**   **Objectifs**                                                       **Livrables**

  Sprint 14 — Catalogue et recherche             41-43          Liste, filtres, carte des annonces sur mobile                       Recherche mobile fonctionnelle avec carte native

  Sprint 15 — Publication d'annonce mobile      44-46          Création d'annonce avec capture photo native                       Un propriétaire peut publier une annonce complète depuis mobile

  Sprint 16 — Vérification documentaire mobile   47-48          Scan de pièce via caméra, connexion biométrique                     Upload de document et Face ID/empreinte fonctionnels

  Sprint 17 — Paiements et notifications push    49-51          Abonnement mobile, notifications temps réel                         Paiement Paystack mobile et notification push reçue

  Sprint 18 — Bêta interne                       52-53          Tests via TestFlight (iOS) et Play Internal Testing (Android)       10-15 testeurs réels ont utilisé l'app une semaine

  Sprint 19 — Corrections pré-soumission         54-55          Correction des retours bêta, conformité guidelines stores           Aucun bug critique reporté par les testeurs

  Sprint 20 — Soumission et publication          56-58          Soumission App Store et Play Store, gestion des retours de review   Apps publiées et téléchargeables publiquement
  ———————————————— ————-- ——————————————————————- —————————————————————--

+———————————————————————————————————————————————————————————————————————————————————————————--+
| **Point de vigilance calendaire**                                                                                                                                                                                                                                                 |
|                                                                                                                                                                                                                                                                                   |
| La review Apple prend historiquement entre quelques jours et plusieurs semaines, avec un risque de rejet nécessitant une resoumission. Ce délai est hors de notre contrôle — le sprint 20 inclut une marge, mais un rejet peut décaler la publication au-delà de la semaine 58. |
+———————————————————————————————————————————————————————————————————————————————————————————--+

## 7. Phase 4 — Expansion nationale (Semaines 59-71)

  ——————————————— ————-- ———————————————————-- ——————————————————--
  **Sprint**                                    **Semaines**   **Objectifs**                                               **Livrables**

  Sprint 21 — Extension géographique          59-62          Ouverture à d'autres grandes villes de Côte d'Ivoire      Catalogue actif sur au moins 2 nouvelles villes

  Sprint 22 — Scaling infrastructure          63-65          Vérification de la tenue en charge (Supabase, Cloudinary)   Aucune dégradation de performance mesurée à l'échelle

  Sprint 23-24 — Consolidation multi-villes   66-71          Ajustements terrain, support, itérations                    Présence stable dans les villes ouvertes
  ——————————————— ————-- ———————————————————-- ——————————————————--

## 8. Phase 5 — Expansion régionale (Semaines 72-87+)

Cette phase reste volontairement moins détaillée : elle dépend des résultats de la phase 4 et de décisions encore ouvertes (pays cibles, calendrier — voir PRD section 14). Elle consiste en une évaluation de marché avant tout engagement de développement supplémentaire.

-   Étude de marché sur les pays ouest-africains candidats

-   Évaluation des adaptations nécessaires (langue, moyens de paiement locaux, cadre réglementaire)

-   Décision argumentée d'expansion ou de concentration sur la Côte d'Ivoire

## 9. Risques calendaires spécifiques au mode solo + IA

  ————————————————————— ———————————————————————————————— ——————————————————————————————-
  **Risque**                                                      **Impact**                                                                                       **Mitigation**

  Absence de parallélisation                                      Un blocage sur une tâche retarde tout le reste, aucun autre développeur pour prendre le relais   Prioriser strictement une tâche à la fois, éviter le multitâche entre phases

  Pas de revue de code indépendante                               Bugs ou failles de sécurité non détectés par un second regard humain                             Revue systématique par Claude Code + tests manuels ciblés avant chaque mise en production

  Délai de review App Store/Play Store                            Peut décaler la publication de plusieurs semaines, hors de notre contrôle                        Soumettre tôt avec une marge, anticiper les guidelines dès le développement

  Charge combinée dev + business (support pilote, partenariats)   Le temps de développement effectif par semaine peut être inférieur aux estimations               Revoir les durées de phase toutes les 4-6 semaines à l'aune du rythme réel observé
  ————————————————————— ———————————————————————————————— ——————————————————————————————-

## 10. Annexe — Suivi et mise à jour du calendrier

Ce calendrier est une estimation de départ, pas un engagement contractuel. Recommandation : réviser la durée de chaque phase à son démarrage, à la lumière du rythme réel constaté sur la phase précédente, plutôt que de forcer le respect des semaines indiquées ici.
