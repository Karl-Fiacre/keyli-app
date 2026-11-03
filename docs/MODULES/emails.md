# MODULE : Emails

## Décisions
- **Fournisseur : Resend** (choix du porteur, 2026-11-01), branché comme
  serveur SMTP de Supabase Auth. Les emails d'authentification restent
  envoyés par Supabase ; Resend ne fait que les acheminer.
- **Domaine d'envoi : keyli.ci** (disponible au registre NIC.CI le
  2026-11-01, achat en cours côté porteur). Resend n'envoie à des
  destinataires quelconques qu'après vérification DNS d'un domaine : sans
  domaine vérifié, seul le titulaire du compte Resend reçoit les emails.
- Expéditeur prévu : `Keyli <no-reply@keyli.ci>`.

## Modèles (supabase/templates/)
| Fichier | Déclencheur Supabase | Objet |
|---|---|---|
| `confirmation.html` | inscription | Confirmez votre adresse email — Keyli |
| `recovery.html` | mot de passe oublié | Réinitialisez votre mot de passe — Keyli |
| `email_change.html` | changement d'adresse (envoyé aux deux adresses, `double_confirm_changes`) | Confirmez votre nouvelle adresse email — Keyli |
| `magic_link.html` | lien de connexion (non utilisé par l'interface aujourd'hui) | Votre lien de connexion — Keyli |
| `password_changed_notification.html` | mot de passe modifié (alerte de sécurité) | Votre mot de passe Keyli a été modifié |

- Liens : `{{ .ConfirmationURL }}` (flux par défaut de Supabase, compatible
  avec `/verifier-email` et `/nouveau-mot-de-passe` de l'application). Logo :
  `{{ .SiteURL }}/keyli-logo-240.png`, servi par le site.
- Mise en page commune (tableaux + styles en ligne, seule écriture fiable
  dans Gmail et Outlook) : toute retouche se reporte sur les cinq fichiers.
  Couleurs en hexadécimal dérivées des tokens (`docs/DESIGN_SYSTEM.md`,
  section Emails).
- Local : déclarés dans `supabase/config.toml`, visibles dans Mailpit
  (http://127.0.0.1:54324) après `npm run db:reset`.
- Distant : **à recopier** dans le tableau de bord Supabase
  (Authentication > Emails > Templates), objet et contenu, une fois le SMTP
  Resend en place.

## Emails de notification (décision du porteur, 2026-11-02)
Migration `20261107120000_emails_notifications_keyli.sql`, Edge Function
`envoyer-emails`, tests `emails_notifications_keyli.test.sql` (27).
- **Architecture : file d'envoi + tâche planifiée.** Déclencheurs sur
  `notifications_keyli` et `messages_keyli` → table
  `emails_sortants_keyli` ; tâche `keyli-envoi-emails` (pg_cron, chaque
  minute) → `declencher_envoi_emails_keyli()` → appel pg_net de l'Edge
  Function seulement s'il y a des emails dus → `prendre_emails_keyli`
  (lot verrouillé, `skip locked`) → Resend → `terminer_email_keyli`.
  Échec : nouvel essai dans 5, 10, 15, 20 min, abandon à la 5e tentative.
- **Événements (choix du porteur)** : réservations (demande, acceptée,
  refusée, annulée), visites (planifiée, modifiée, annulée), compte et
  vérification (document approuvé/rejeté, badge retiré, compte
  suspendu/réactivé), abonnement (rappel, expiré, dépassement), alertes de
  recherche, nouveaux messages. Restent dans l'application : recommandation
  de forfait, visite effectuée.
- **Messages regroupés** : un email par conversation au plus, envoyé
  5 minutes après le premier message non lu et au moins 15 minutes après
  le précédent ; écarté si tout a été lu entre-temps, ou si la conversation
  vient d'être ouverte par une demande de réservation (déjà annoncée).
- **Préférence** : `profiles_keyli.emails_notifications` (interrupteur
  dans Profil). Emails de service toujours envoyés : compte suspendu /
  réactivé, badge retiré. **Désinscription sans connexion** : lien
  `/desinscription?jeton=…` (`profiles_keyli.jeton_desinscription`), avec
  un clic de confirmation (les antivirus de messagerie ouvrent les liens).
- Contenu : titre et texte de la notification (déjà rédigés en français
  par la base), bouton vers la bonne page (table alignée sur
  `src/lib/notifications.ts`), mise en page des modèles d'authentification.
- Transport : `RESEND_API_KEY` (secret d'Edge Function) ; en local, sans
  clé, Mailpit (`MAILPIT_URL=http://supabase_inbucket_keyli:8025`).
  Expéditeur `EMAIL_EXPEDITEUR` (défaut `Keyli <no-reply@keyli.ci>`).
  Liens : `KEYLI_APP_URL` (déjà posé pour Paystack).
- Vérifié en local le 2026-11-02 : tâche planifiée → pg_net → fonction →
  4 emails reçus dans Mailpit, 1 écarté (doublon de la demande de
  réservation) ; page de désinscription.

## Mise en service des notifications (porteur)
- [ ] `npx supabase db push --linked` puis `npx supabase test db --linked`
- [ ] `npx supabase functions deploy envoyer-emails`
- [ ] Coffre (SQL Editor du projet distant) — valeurs publiques du site :
      `select vault.create_secret('https://zcqirdowjussoaevqlbd.supabase.co', 'keyli_url_projet');`
      `select vault.create_secret('<clé anon / publishable du projet>', 'keyli_cle_anon');`
- [ ] Secret `RESEND_API_KEY` (et `EMAIL_EXPEDITEUR` si autre que
      no-reply@keyli.ci) posé par le porteur, une fois le domaine vérifié
      dans Resend. Avant cela, les emails restent en file et sont
      réessayés puis abandonnés : rien n'est perdu côté application.

## Mise en service (quand keyli.ci est actif)
- [ ] Compte Resend créé (porteur)
- [ ] keyli.ci ajouté à Cloudflare (DNS), serveurs DNS changés chez le
      bureau d'enregistrement (porteur)
- [ ] Domaine ajouté dans Resend, enregistrements DNS (SPF, DKIM, MX de
      retour) créés dans Cloudflare, domaine vérifié
- [ ] Supabase distant : SMTP Resend (`smtp.resend.com`, port 465,
      utilisateur `resend`, mot de passe = clé d'API Resend saisie par le
      porteur), expéditeur `no-reply@keyli.ci`, nom « Keyli »
- [ ] Modèles recopiés dans le tableau de bord, test réel d'inscription et
      de réinitialisation
- [ ] Limite d'envoi Supabase relevée (Authentication > Rate Limits) une
      fois le SMTP personnalisé actif
