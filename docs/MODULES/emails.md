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
