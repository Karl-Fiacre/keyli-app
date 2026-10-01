# Keyli — Contexte projet

## Produit
Keyli est une plateforme immobilière de confiance pour la Côte d'Ivoire
(pilote Abidjan), avec ambition sous-régionale ouest-africaine à terme.
Éditeur : Nguessan-IT, Abidjan, Côte d'Ivoire. Dev solo assisté par Claude
Code : Fiacre Nguessan.

## Modèle
Pas multi-tenant — une seule instance de plateforme, tous les utilisateurs
(chercheurs, propriétaires, agences, admin) partagent la même base. La
distinction se fait par rôle (`user_role_keyli`), pas par isolation tenant.

## Stack (voir STACK.md pour le détail)
Web/PWA : React 18 + TypeScript + Vite + TailwindCSS + Shadcn/ui
Backend : Supabase (PostgreSQL + Auth + RLS + Edge Functions)
Mobile (cible) : React Native (Expo), code métier partagé avec le web
Médias : Cloudinary — Paiements : Paystack

## Règles non-négociables
1. Nouveau compte Supabase, nouveau projet dédié, **schéma reconstruit de
   zéro** (pas migré depuis l'ancien) — PostGIS activé dès la première
   migration. Voir DATABASE.md et MODULES/geolocalisation.md.
2. Toutes les tables/enums canoniques sont suffixées `_keyli` — jamais les
   versions non suffixées (dette technique, voir DATABASE.md).
3. Row-Level Security active et testée sur chaque table contenant des
   données utilisateur (documents, transactions, messages).
4. Limite de taille/format sur tout upload de document, appliquée côté
   serveur, pas seulement côté interface.
5. Le logo Keyli n'apparaît jamais confondu avec le badge de vérification
   des biens — deux assets distincts, deux usages distincts (voir LOGO.md).
6. Prix par forfait : Propriétaire 5 000 XOF/mois (1-4 annonces), Agence
   Moyenne 15 000 XOF/mois (5-10), Grande Agence 25 000 XOF/mois (11-30 ;
   au-delà : 1 000 XOF/annonce ou formule négociée) — voir PRD_REGLES.md pour les règles de calcul.
7. Commentaires de code en français, noms de variables/fonctions en
   camelCase anglais (cohérence avec le code déjà existant).

## Documents de référence externes à ce paquet
- PRD complet (vision produit, roadmap, modèle économique) : Keyli_PRD_v1.5.docx
- Calendrier de développement : Keyli_Calendrier_Definitif.docx
- Répertoire de fichiers sources détaillé : Keyli_Repertoire_Fichiers_Sources_Definitif.docx
