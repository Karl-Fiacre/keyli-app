# MODULE : Mobile React Native (Phase 3)

⚠️ Module trouvé manquant lors d'un rescan — `STRUCTURE_FRONTEND.md`
décrit l'arborescence cible et `.claude/rules/react-native-mobile.md`
donne les conventions de code, mais aucun fichier ne détaillait les
modules natifs, la distribution bêta et la soumission stores. Ne pas
commencer la Phase 3 sans ce fichier.

## Prérequis avant toute ligne de code mobile
- [ ] Phase 2 réellement terminée — aucun bug bloquant connu côté web (voir
      `etat_avancement.md`)
- [ ] Logique métier déjà extraite en hooks/services partageables pendant
      la Phase 2 (Sprint 10-11) — si ce n'est pas fait, le faire avant de
      commencer le mobile, pas en parallèle
- [ ] IDs d'applications (`com.keyli.app` ou équivalent) confirmés avec le
      fondateur — voir STACK.md, jamais choisis unilatéralement (irréversible
      une fois publié)

## Modules natifs requis
| Besoin | Module / API | Notes |
|---|---|---|
| Vérification documentaire (scan pièce) | Caméra native + recadrage | Réutilise la même logique de validation que `validate-property-image` côté serveur |
| Connexion rapide | Face ID (iOS) / Empreinte (Android) | Remplace uniquement la saisie du mot de passe à la connexion — ne remplace jamais la vérification documentaire admin (voir MODULES/verification.md) |
| Notifications push | APNs (iOS) / FCM (Android) | Nouveau message, statut de vérification, expiration d'abonnement — mêmes événements que les notifications email existantes, canal différent |
| Alertes de proximité | Géolocalisation en arrière-plan | Dépend de PostGIS déjà tranché (voir DATABASE.md) — nécessite une permission de localisation continue, à documenter clairement dans le flux de consentement iOS/Android |
| Mode hors-ligne | Cache local des annonces consultées | Pas de mécanisme de synchronisation différée prévu en v1 — lecture seule hors-ligne, pas d'écriture en attente de reconnexion |

## Ce qui est partagé avec le web — ne jamais réécrire
`src/hooks/`, `src/services/api/`, `src/lib/`, `src/integrations/supabase/`
(voir STRUCTURE_FRONTEND.md et .claude/rules/react-native-mobile.md). Si une
règle métier semble devoir différer entre web et mobile, le signaler avant
de coder une version mobile-only — la divergence silencieuse entre les deux
plateformes est le risque principal identifié pour cette phase.

## Distribution bêta (Sprint 18)
```
iOS     → TestFlight, 10-15 testeurs, invitation par email
Android → Play Console, piste de test interne, lien d'opt-in
```
Durée cible : une semaine minimum avant de passer aux corrections
pré-soumission — ne pas raccourcir pour gagner du temps, les retours de
testeurs réels sont la seule validation avant que les deux stores entrent
dans la boucle (délai de review hors de notre contrôle une fois soumis).

## Soumission stores (Sprint 20)
- [ ] Icônes déjà prêtes (`keyli_brand_assets/keyli_app_icon_1024.png` pour
      iOS, `keyli_app_icon_adaptive_foreground_432.png` + fond navy pour
      l'icône adaptative Android) — voir LOGO.md
- [ ] Vérifier les guidelines Apple (App Store Review Guidelines) et Google
      (Play Console policies) avant la soumission, pas après un premier
      rejet — en particulier sur la géolocalisation en arrière-plan et
      l'authentification biométrique, deux points fréquemment scrutés
- [ ] ⚠️ Délai de review hors de notre contrôle (quelques jours à plusieurs
      semaines, risque de rejet nécessitant une resoumission) — voir
      calendrier.md, Sprint 20, "Point de vigilance calendaire"
- [ ] Aucune clé secrète dans le bundle mobile livré aux stores — mêmes
      règles que le web (STACK.md)

## Non couvert ici — à trancher avant le code
- [ ] Stratégie de mise à jour forcée (version mobile obsolète qui ne peut
      plus appeler l'API) — non définie
- [ ] Gestion des notifications push quand l'utilisateur a plusieurs
      appareils — non définie
