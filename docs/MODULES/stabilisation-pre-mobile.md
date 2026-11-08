# Module : stabilisation pré-mobile (Sprint 11-12)

Statut : terminé le 2026-11-08 (branche `feature/sprint11-stabilisation`).
Objectif : laisser une base saine et sûre avant l'application mobile, qui
réutilisera la même base et les mêmes règles (`docs/LOGIQUE_PARTAGEE.md`).

Périmètre choisi par le porteur : sécurité de la base, sécurité des
fonctions et du site, email du profil synchronisé, dette technique.

## 1. Sécurité de la base

### Constat de l'audit
Supabase accorde par défaut **tous** les droits aux rôles `anon` (visiteur)
et `authenticated` (compte connecté) sur chaque nouvelle table et fonction
du schéma `public`. Les migrations Keyli retirent ces droits puis accordent
le strict nécessaire, mais le retrait avait été oublié sur trois tables :
`emails_sortants_keyli`, `reservations_keyli`, `types_chambres_keyli`.

La RLS bloquait déjà les lectures et écritures non prévues, sauf :
- **TRUNCATE** (vider une table), que la RLS ne couvre pas ;
- les droits **par colonne** de `types_chambres_keyli`, rendus inopérants
  par le droit UPDATE accordé sur toute la table.

Aucun appel du site n'utilisait ces droits en trop.

### Corrections
- Migration `20261117120000_securite_droits_keyli.sql` : droits exacts sur
  les trois tables ; plus aucun droit par défaut pour les objets futurs
  (tables, séquences, fonctions créées par les migrations). Le rôle
  `service_role` des Edge Functions garde les siens.
- Migration `20261117140000_disponibilite_recherche_keyli.sql` — **bug
  trouvé grâce à l'audit** : la recherche par dates lisait directement les
  réservations, que la RLS cache aux visiteurs et aux autres comptes. Un
  logement déjà réservé par quelqu'un d'autre apparaissait donc libre. Elle
  passe désormais par `occupation_sejour_keyli`, qui voit toutes les
  réservations acceptées mais ne renvoie que des nombres. Les anciens tests
  ne le voyaient pas : ils cherchaient connectés en tant qu'hôte. Deux tests
  ajoutés (autre compte, visiteur) ; ils échouent avec l'ancienne version.

### Audit permanent
`supabase/tests/audit_securite_keyli.test.sql` (13 contrôles, exécuté en
CI) échoue dès qu'une migration affaiblit une règle :
- RLS activée et au moins une policy sur chaque table ; suffixe `_keyli` ;
- aucun TRUNCATE, REFERENCES ni TRIGGER pour les comptes ; aucun droit
  d'écriture visiteur sur une table entière ; toute écriture d'un compte
  encadrée par une policy ;
- toute fonction `security definer` fixe son `search_path` ;
- liste fermée des fonctions `security definer` ouvertes aux visiteurs (9,
  chacune justifiée dans le test) ; fonctions serveur fermées aux comptes ;
- seule `profils_publics_keyli` contourne la RLS, sans email, téléphone,
  nom complet ni jeton ;
- aucun bucket de stockage public ;
- aucun droit par défaut pour les objets futurs.

Ajouter une exception à une liste de ce test est une décision consciente, à
justifier dans la migration concernée.

## 2. Sécurité des fonctions et du site

- **Bug corrigé — envoi des photos bloqué** : la Content-Security-Policy
  (Sprint 6) n'autorisait pas `https://api.cloudinary.com`, adresse
  d'envoi direct des photos. Le navigateur bloquait donc l'ajout de photos
  depuis le site en ligne. Ajouté à `connect-src` dans `public/_headers`.
- **Erreurs internes masquées** : `handle-paystack-payment` et
  `envoyer-emails` renvoyaient le texte brut d'une erreur inattendue de la
  base. Elles renvoient désormais un message générique et écrivent le détail
  dans les journaux de la fonction. Les messages métier prévus (forfait,
  compte) restent affichés.
- **CORS `*` conservé, décision argumentée** : les fonctions authentifient
  par jeton (`Authorization`), jamais par cookie ; une autre origine ne peut
  donc rien faire au nom d'un utilisateur. L'application mobile n'envoie pas
  d'origine : une liste d'origines n'apporterait rien et risquerait de la
  bloquer. Le webhook Paystack vérifie sa signature.
- **Revue sans changement** : `cloudinary-signature` (comptes propriétaire
  et agence actifs, 10 photos par demande, identifiant et formats imposés
  par la signature) ; `get-maps-config` (clé publique restreinte par
  référent côté Google) ; `rapprocher-paiements` (vérification ciblée
  réservée aux admins) ; en-têtes du site (HSTS, nosniff, X-Frame-Options,
  frame-ancestors 'none', Referrer-Policy, Permissions-Policy).

## 3. Email du profil synchronisé

Migration `20261117130000_email_profil_synchronise_keyli.sql` :
`profiles_keyli.email` sert aux emails de notification et au paiement
Paystack, mais ne suivait pas un changement d'adresse dans Supabase Auth.
Un déclencheur sur `auth.users` (`on_auth_user_email_keyli`) la recopie
désormais. Supabase Auth ne change l'adresse qu'après confirmation par le
lien envoyé : la copie suit donc toujours une adresse confirmée. Les profils
déjà décalés sont rattrapés par la migration. Tests :
`email_profil_keyli.test.sql` (4).

## 4. Dette technique

- Aucun fichier source inutilisé, aucune dépendance déclarée mais non
  importée.
- `npm audit` : 7 alertes modérées venant de `minimatch` (ESLint, outil de
  développement), sans effet sur le site publié ; déjà présentes avant ce
  sprint.
- Suivi `docs/etat_avancement.md` remis à jour : statut en tête, points
  résolus retirés des blocages (email du profil, fournisseur d'email, CSP).
- Données locales : annonces de démonstration du Sprint 8 supprimées (elles
  faussaient 5 fichiers de tests).

## Mise en ligne (porteur)
1. `npx supabase db push --linked` (3 migrations) ;
2. déploiement des fonctions `handle-paystack-payment` et `envoyer-emails` ;
3. `npm run deploy` (nouvelle CSP).

Vérification après mise en ligne : droits des trois tables, absence de
droits par défaut, recherche visiteur, en-tête CSP servi.
