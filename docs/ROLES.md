# Rôles et permissions — Keyli

## Enum réel : user_role_keyli
```sql
('user', 'owner', 'agency', 'admin')
```
⚠️ `profiles_keyli.role_keyli` est stocké en `TEXT`, pas en type `user_role_keyli`
— aucune contrainte de base ne garantit qu'une valeur hors de cet enum ne soit
insérée. Valider côté application (Zod) tant que la colonne n'est pas migrée
vers le type enum.

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

## Règle de vérification par rôle
```
owner  → document_type_keyli IN ('acd', 'extrait_naissance', 'cert_residence')
agency → document_type_keyli = 'registre' (registre de commerce) obligatoire
```
Cette distinction n'est pas encore appliquée en base (pas de contrainte
`CHECK` liant `role_keyli` et `doc_type` accepté) — à valider côté
application tant que la contrainte SQL n'existe pas.
