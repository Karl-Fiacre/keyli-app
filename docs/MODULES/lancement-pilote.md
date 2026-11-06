# Module — Lancement et suivi du pilote (Sprint 5)

Décision du porteur (2026-11-06) : quatre chantiers pour l'ouverture du
pilote d'Abidjan — candidature, suivi, partage d'annonce, site plus rapide.
Migration : `supabase/migrations/20261112120000_lancement_pilote_keyli.sql`.
Tests : `supabase/tests/lancement_pilote_keyli.test.sql`.

## 1. Candidature au pilote (`/pilote`)
- Page publique `src/pages/Pilote.tsx` : profil (propriétaire, agence,
  chercheur), nom de l'agence si agence, prénom, nom, téléphone (+225
  obligatoire : l'équipe rappelle), email, commune et nombre de biens
  facultatifs, message.
- Liens : pied de page (« Rejoindre le pilote ») et page À propos.
- Envoi : `candidater_pilote_keyli` (hook `useCandidaturePilote`,
  `src/hooks/usePilote.ts`). La base valide tout, met l'email en
  minuscules, limite à 100 candidatures par heure sur la plateforme et
  répond toujours de la même façon (un email déjà inscrit n'est pas
  révélé). Une candidature encore « en attente » est mise à jour ; une
  candidature déjà traitée n'est pas modifiée.
- Pas de compte créé à la candidature : l'équipe accompagne la personne,
  qui crée ensuite son compte (« Compte créé » apparaît alors dans la file).

## 2. Suivi du pilote (`/admin/pilote`)
`src/pages/admin/AdminPilote.tsx`, données de `suivi_pilote_keyli()` :
- **Démarrage des annonceurs** : part des propriétaires et agences ayant
  complété leur profil, envoyé leurs pièces, obtenu le badge, un forfait en
  cours, une annonce publiée (mêmes règles que le parcours de démarrage,
  `docs/MODULES/demarrage-retours.md`).
- **Activité** : candidatures (par statut, avec compte), retours en attente,
  visites planifiées et effectuées, avis, demandes et séjours acceptés.
- **File des candidatures** (`candidatures_pilote_keyli(statut)`) : par
  statut (en attente, contactée, convertie, écartée), priorité haute
  d'abord ; téléphone et email cliquables, priorité et note de l'équipe
  modifiables. Priorité posée à la main (pas de règle automatique validée).
- Les objectifs chiffrés du PRD (vérification ≥ 70 %, note ≥ 4,0, 500
  annonces) restent dans l'onglet Indicateurs : aucun nouveau seuil inventé.

## 3. Partage d'annonce
- `src/components/annonce/BoutonPartager.tsx`, sur la fiche (sauf annonce
  archivée) : feuille de partage du téléphone si disponible, sinon menu
  « Envoyer par WhatsApp » / « Copier le lien ».
- Le lien porte `?source=lien_direct` : les vues venues d'un partage sont
  comptées dans `property_interactions_keyli`.
- Aperçu des liens (`index.html`, balises Open Graph) : le même pour toutes
  les pages, car l'application est rendue dans le navigateur. Un aperçu
  propre à chaque annonce (photo, prix) demanderait un rendu côté serveur
  (Cloudflare Pages Functions) — non fait. Domaine de l'image à passer à
  keyli.com une fois branché.

## 4. Site plus rapide
- `src/App.tsx` : toutes les pages sauf l'accueil et la page introuvable
  sont chargées à la demande (`React.lazy`). Indicateur
  `src/components/ChargementPage.tsx` dans les cadres (`MiseEnPage`,
  `CadreConnecte`, `Admin`).

## Reste ouvert
- Tarif des annonceurs pendant le pilote (PRD_REGLES : à décider).
- Relances automatiques (candidatures sans réponse, parcours inachevé).
