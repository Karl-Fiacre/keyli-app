# Rôles et permissions — Keyli

## Enum réel : user_role_keyli
```sql
('user', 'owner', 'agency', 'admin', 'super_admin')   -- super_admin ajouté le 2026-10-02
```
Dans le nouveau schéma, `profiles_keyli.role_keyli` est bien typé
`user_role_keyli` (c'était un `TEXT` dans l'ancien pilote). Le client ne
peut jamais le modifier : rôle fixé à l'inscription par trigger (`admin`
refusé), puis modifiable côté serveur uniquement — voir DATABASE.md,
décision « sécurité de profiles_keyli ».

## user (chercheur de bien)
- Recherche et consultation d'annonces
- Messagerie interne avec propriétaires/agences
- Notation après transaction (`ratings_keyli`)
- Favoris, alertes de recherche
- Aucun accès à la publication d'annonces

## owner (propriétaire)
- Publication d'annonces (`properties_keyli`, dans la limite du forfait)
- Upload de documents de vérification (`documents_keyli`)
- Gestion d'abonnement (`subscriptions_keyli`)
- Dashboard propriétaire (voir MODULES/dashboard.md)

## agency (agence)
- Mêmes droits qu'`owner`, à volume supérieur (forfaits Agence Moyenne/Grande
  Agence — voir PRD_REGLES.md)
- Dashboard agence avec pipeline de leads (à construire — voir répertoire de
  fichiers sources, `AgencyDashboard.tsx`)
- Vérification par registre de commerce (`documents_keyli.doc_type = 'registre'`),
  pas seulement pièce d'identité

## admin
- File de vérification des documents (`documents_keyli`, `status`)
- Modération des signalements (`reports_keyli`)
- Consultation des retours utilisateurs (`feedback_keyli`)
- Journal d'audit (`audit_logs_keyli`) — chaque action admin sensible doit y
  être écrite, pas seulement les suppressions
- Gestion des templates marketing (`marketing_templates_keyli`)
- Suivi des inscriptions pilote (`inscription_pilot_keyli`)

## super_admin (décision du porteur de projet, 2026-10-01/02)
Rôle supérieur à `admin` : tous les droits de l'admin, plus :
- Nommer / retirer les admins (seul à attribuer le rôle `admin`)
- Modifier les forfaits (`plans_keyli` : prix, seuils)
- Négocier et valider les formules personnalisées de dépassement
  (Grande Agence au-delà de 30 annonces, voir MODULES/pricing.md)
- Lire le journal d'audit complet (`audit_logs_keyli`), actions des admins
  comprises
- Générer les rapports et analyses
- Gérer les litiges
- Importer / gérer les clés API (intégrations tierces)
- Sécurité informatique
- Juridique : mentions légales, politique de confidentialité, conditions
  générales d'utilisation
- Autres droits à trancher au moment opportun

Jamais attribuable à l'inscription (refusé par le trigger, testé) — SQL
direct uniquement.

Implémenté le 2026-10-02 (module admin) : nommer/retirer les admins
(`super_admin_changer_role_keyli`), modifier les forfaits
(`super_admin_modifier_forfait_keyli`), formules négociées
(`super_admin_formule_negociee_keyli`), lecture du journal d'audit complet.
Restent à implémenter : rapports et analyses, litiges, clés API, sécurité
informatique, textes juridiques. Le rôle lui-même a été créé par la
migration `20261002120000_role_super_admin_keyli.sql`.

## Règle de vérification par rôle
```
owner  → document_type_keyli IN ('acd', 'extrait_naissance', 'cert_residence')
agency → document_type_keyli = 'registre' (registre de commerce) obligatoire
```
Appliquée en base depuis le 2026-10-02 par la policy INSERT de
`documents_keyli` (testé) — pas seulement côté application.
