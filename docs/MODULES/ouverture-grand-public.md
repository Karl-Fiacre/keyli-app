# Module — Ouverture grand public (Sprint 7)

Décision du porteur (2026-11-07) : quatre chantiers pour passer du pilote à
un site ouvert à tous — passage grand public, référencement Google, aide et
support, services en mode réel.
Migration : `supabase/migrations/20261114120000_support_visiteurs_keyli.sql`.
Tests : `supabase/tests/support_visiteurs_keyli.test.sql` (14 tests, 743 au
total).

## 1. Passage grand public
- La page `/pilote` devient `/partenaires` (`src/pages/Partenaires.tsx`) :
  « Publiez vos biens avec Keyli », réservée aux propriétaires et agences
  (le profil « Je cherche un logement » n'y est plus proposé : un chercheur
  crée directement son compte). L'ancienne adresse redirige vers la
  nouvelle. Les demandes arrivent toujours dans l'onglet admin « Pilote »
  (`candidater_pilote_keyli`, table `inscription_pilot_keyli` inchangée).
- Textes : pied de page « Devenir partenaire », page À propos (« Propriétaire
  ou agence ? »), bandeau de l'accueil (Abidjan « Ouvert à tous »),
  communes (« {n} communes couvertes. Choisissez la vôtre. »).
- Emails d'authentification en français : déjà prêts en local
  (`supabase/config.toml`, `supabase/templates/*.html`), à recopier sur le
  projet distant par le porteur (voir `docs/MISE_EN_PRODUCTION.md`).

## 2. Référencement
- Titre d'onglet et description propres à chaque page publique :
  `src/hooks/useTitrePage.ts` (« Titre | Keyli » ; titre générique sans
  argument). Fiche annonce : titre de l'annonce et 155 premiers caractères
  de la description.
- Fonctions Cloudflare Pages (`functions/`, déployées avec le site par
  `wrangler pages deploy`) :
  - `sitemap.xml` : pages publiques + annonces non archivées lisibles par un
    visiteur (5 000 au plus, `lastmod` = dernière mise à jour) ;
  - `robots.txt` : espaces privés exclus, plan du site sur le domaine
    appelé ; les adresses de prévisualisation (`xxxxxxxx.keyli-2gc.pages.dev`)
    sont entièrement exclues pour éviter les doublons ;
  - `annonce/[id]` : la page renvoyée porte déjà le titre, le prix, le lieu
    et la photo de l'annonce (balises Open Graph et Twitter, photo
    Cloudinary recadrée 1200 × 630, adresse canonique). Annonce absente,
    archivée, identifiant invalide ou base injoignable : page générique
    servie telle quelle. Cache 5 minutes.
- Lecture de la base : REST public avec la clé publique (anon), RLS
  appliquée comme pour un visiteur. URL et clé publique sont écrites au
  déploiement dans `functions/_config.generated.ts` (non versionné) par
  `scripts/config-fonctions.mjs`, à partir de `.env`
  (`npm run deploy`). Aucune clé secrète dans les fonctions.
- Test local : `npx wrangler@4 pages dev dist --compatibility-date 2026-05-01`
  (la version locale de wrangler n'accepte pas encore la date du jour).
- Constaté le 2026-11-07 : la base distante ne renvoie aucune annonce à un
  visiteur, le plan du site ne contient donc que les pages publiques ;
  l'aperçu des annonces a été vérifié en local sur des données simulées.

## 3. Aide et support
- Les comptes connectés gardent les « retours » (`feedback_keyli`, réponse
  suivie, notification) : `docs/MODULES/demarrage-retours.md`.
- Nouveau : formulaire « Nous contacter » de la page Aide
  (`src/components/aide/FormulaireSupport.tsx`), ouvert à tous, même sans
  compte ou quand on ne peut plus se connecter. Champs : nom, email pour la
  réponse, sujet (compte, annonce, vérification, paiement, partenariat,
  autre), message (10 à 2 000 caractères). Email pré-rempli si connecté,
  avec un lien vers « Mes retours ».
- Base : `demandes_support_keyli`, envoi uniquement par
  `envoyer_demande_support_keyli(email, nom, sujet, message)` (visiteurs
  compris) : validation, 3 demandes par heure et par adresse, 200 par heure
  au total. Le compte de l'expéditeur est rattaché s'il était connecté.
- Back-office : onglet « Support » (`/admin/support`) — demandes par statut
  (nouvelles, en cours, traitées, classées), bouton « Répondre » (ouvre la
  messagerie de l'équipe), note interne. Pas de réponse automatique : la
  réponse part de la boîte de l'équipe.
- FAQ enrichie : position approximative sur la carte, accompagnement des
  propriétaires et agences (`/partenaires`), fermeture de compte par le
  formulaire.
- Pas de bouton WhatsApp : aucun numéro d'assistance n'a été fourni. À
  ajouter quand le porteur en communique un (ne jamais en inventer).

## 4. Services en mode réel
Guide pas à pas pour le porteur : `docs/MISE_EN_PRODUCTION.md` (domaine,
emails Resend, Paystack live, adresses Supabase Auth, emails
d'authentification en français, clés Google Maps). Toutes les clés, tous
les achats et tous les réglages des tableaux de bord sont faits par le
porteur.

## Reste à faire
- [ ] Porteur : `npx supabase db push --linked` (migration du support), puis
      `npm run deploy` (site + fonctions)
- [ ] Après déploiement : vérifier `https://keyli-2gc.pages.dev/robots.txt`,
      `/sitemap.xml`, et l'aperçu d'une vraie annonce (débogueur de partage
      Facebook ou envoi du lien sur WhatsApp)
- [ ] Déclarer le plan du site dans Google Search Console une fois keyli.com
      actif (porteur)
- [ ] Étapes de `docs/MISE_EN_PRODUCTION.md`
