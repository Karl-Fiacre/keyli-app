# Mise en production — guide pas à pas (porteur)

Sprint 7 (2026-11-07), `docs/MODULES/ouverture-grand-public.md`. Chaque
étape est faite **par le porteur** : achats, création de comptes, saisie des
clés et réglages des tableaux de bord. Ne jamais coller une clé secrète dans
le code, un fichier versionné ou une conversation.

Ordre conseillé : 1 → 2 → 3 → 4 → 5 → 6. Les étapes 1 et 2 conditionnent les
emails ; Paystack (5) peut se faire indépendamment.

## 1. Domaine keyli.com
- [ ] Acheter keyli.com (bureau d'enregistrement au choix).
- [ ] Cloudflare > Add a site > keyli.com (offre Free), puis remplacer les
      serveurs DNS chez le bureau d'enregistrement par ceux indiqués par
      Cloudflare. Attendre l'état « Active ».
- [ ] SSL/TLS : mode « Full (strict) ».
- [ ] Workers & Pages > projet `keyli` > Custom domains : ajouter
      `keyli.com` et `www.keyli.com` (Cloudflare crée les enregistrements).
- [ ] Rediriger `www.keyli.com` vers `keyli.com` (Rules > Redirect Rules),
      pour une seule adresse dans Google.

## 2. Emails (Resend)
Détail : `docs/MODULES/emails.md`, « Mise en service ».
- [ ] Créer le compte Resend ; ajouter le domaine `keyli.com` ; recopier
      dans Cloudflare DNS les enregistrements demandés (SPF, DKIM, retour) ;
      attendre « Verified ».
- [ ] Créer la boîte `contact@keyli.com` (adresse affichée sur le site et
      utilisée pour répondre aux demandes de l'onglet Support).
- [ ] Créer une clé d'API Resend, puis dans un terminal :
      `npx supabase secrets set RESEND_API_KEY=...` (le porteur colle la clé).
- [ ] Supabase > Authentication > Emails > SMTP Settings : hôte
      `smtp.resend.com`, port 465, utilisateur `resend`, mot de passe = la
      clé Resend, expéditeur `no-reply@keyli.com`, nom « Keyli ».
- [ ] Authentication > Rate Limits : relever la limite d'envoi d'emails une
      fois le SMTP actif.

## 3. Adresses du site dans Supabase
- [ ] Authentication > URL Configuration :
  - Site URL : `https://keyli.com`
  - Redirect URLs : `https://keyli.com/**`, `https://keyli-2gc.pages.dev/**`
    (garder l'adresse Cloudflare tant qu'elle sert)
- [ ] `npx supabase secrets set KEYLI_APP_URL=https://keyli.com` (liens des
      emails et retour de paiement Paystack).

## 4. Emails d'authentification en français
Les modèles sont prêts dans le dépôt : `supabase/templates/` (sujets dans
`supabase/config.toml`, sections `[auth.email.template.*]`).
- [ ] Supabase > Authentication > Emails > Templates : pour « Confirm
      signup », « Reset password », « Change email address » et « Magic
      link », recopier le sujet (config.toml) et le contenu du fichier
      correspondant (`confirmation.html`, `recovery.html`,
      `email_change.html`, `magic_link.html`).
- [ ] Test réel : inscription avec une adresse personnelle, puis « Mot de
      passe oublié ».

## 5. Paiements Paystack en mode réel
Détail : `docs/MODULES/pricing.md`.
- [ ] Paystack : compte activé en mode Live (documents de l'entreprise
      validés par Paystack).
- [ ] `npx supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...` (le
      porteur colle la clé live ; la clé test cesse alors de servir).
- [ ] Paystack > Settings > API Keys & Webhooks (mode Live) : URL du
      webhook = `https://zcqirdowjussoaevqlbd.supabase.co/functions/v1/paystack-webhook`.
- [ ] Test réel : un forfait payé par le porteur, vérifier l'abonnement
      actif et la transaction dans le back-office, puis rembourser depuis
      Paystack si besoin.

## 6. Clés publiques et contrôles finaux
- [ ] Google Cloud > Identifiants : ajouter `https://keyli.com/*` aux
      référents autorisés de la clé Google Maps.
- [ ] Cloudinary : rien à changer (envoi signé par l'Edge Function).
- [ ] `npm run deploy` après tout changement de `.env`.
- [ ] Google Search Console : ajouter keyli.com (vérification par DNS dans
      Cloudflare), déclarer `https://keyli.com/sitemap.xml`.
- [ ] Vérifier `https://keyli.com/robots.txt` (doit lister le plan du site
      sur keyli.com) et l'aperçu d'une annonce partagée sur WhatsApp.
- [ ] Mettre à jour l'adresse de fin des vidéos publicitaires si elle doit
      afficher keyli.com (`docs/MODULES/videos.md`).
