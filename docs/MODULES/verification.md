# MODULE : Vérification

Fichiers concernés : `src/pages/AdminVerifications.tsx`,
`src/components/ui/identity-document-upload.tsx`, Edge Functions
`validate-property-image`, `notify-admin-critical`.
Table : `documents_keyli`.

## Flux
```
1. Upload document (owner: acd/extrait_naissance/cert_residence ;
   agency: registre OBLIGATOIRE)
2. Limite de taille/format appliquée côté serveur par le bucket Storage
   privé `documents_keyli` : 5 Mo, PDF / JPEG / PNG (décision du
   2026-10-02, pas d'Edge Function — ne pas en ajouter une redondante)
3. documents_keyli.status = 'pending'
4. Admin traite via AdminVerifications.tsx → RPC
   `admin_reviser_document_keyli` → approved | rejected (audit inclus)
5. Si rejected → review_notes OBLIGATOIRE (jamais de rejet silencieux)
6. Si approved → `properties_keyli.is_verified = true` pour l'ACD du bien ;
   `profiles_keyli.verified = true` pour un propriétaire dès que extrait de
   naissance ET certificat de résidence sont approuvés, pour une agence dès
   que son registre est approuvé (décision du 2026-10-02, testé)
7. notify-admin-critical si document en attente > délai seuil (délai exact
   non défini dans ce lot — demander avant de coder un cron/trigger)
```

## Règles
- [x] agency → document_type = 'registre' approuvé est un prérequis à
      toute publication (refus KY004, testé)
- [x] Un document approved ne peut pas être re-soumis pour le même
      `doc_type` (et le même bien pour un ACD) sans action admin explicite —
      index unique partiel, testé
- [x] Rejet → `review_notes` obligatoire : contrainte CHECK, testée
- [ ] Le contrôle humain reste systématique — aucune auto-approbation, même
      si un futur contrôle automatisé (OCR, détection de fraude) est ajouté
      (voir PRD 13 "Fraude documentaire à la vérification")

## Non couvert ici
- Détection automatisée de fraude documentaire (mentionnée comme mitigation
  dans le PRD mais aucune implémentation ni outil choisi)
- Délai exact de relance avant notification admin critique
