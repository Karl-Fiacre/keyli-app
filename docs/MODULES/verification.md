# MODULE : Vérification

Fichiers concernés : `src/pages/AdminVerifications.tsx`,
`src/components/ui/identity-document-upload.tsx`, Edge Functions
`validate-property-image`, `notify-admin-critical`.
Table : `documents_keyli`.

## Flux
```
1. Upload document (owner: acd/extrait_naissance/cert_residence ;
   agency: registre OBLIGATOIRE)
2. Limite de taille/format appliquée côté serveur (Supabase Storage policy
   ou Edge Function — vérifier laquelle est en place avant d'en ajouter une
   seconde redondante)
3. documents_keyli.status = 'pending'
4. Admin traite via AdminVerifications.tsx → approved | rejected
5. Si rejected → review_notes OBLIGATOIRE (jamais de rejet silencieux)
6. Si approved → profiles_keyli.verified = true (utilisateur) et/ou
   properties_keyli.is_verified = true (bien), selon le type de document
7. notify-admin-critical si document en attente > délai seuil (délai exact
   non défini dans ce lot — demander avant de coder un cron/trigger)
```

## Règles
- [ ] agency → document_type = 'registre' est un prérequis à toute
      publication, pas optionnel comme pour owner
- [ ] Un document approved ne peut pas être re-soumis pour le même
      `doc_type` sans action admin explicite (éviter les doublons en attente)
- [ ] Le contrôle humain reste systématique — aucune auto-approbation, même
      si un futur contrôle automatisé (OCR, détection de fraude) est ajouté
      (voir PRD 13 "Fraude documentaire à la vérification")

## Non couvert ici
- Détection automatisée de fraude documentaire (mentionnée comme mitigation
  dans le PRD mais aucune implémentation ni outil choisi)
- Délai exact de relance avant notification admin critique
