-- Keyli — Plafond du forfait Grande Agence fixé à 30 annonces
--
-- Décision du porteur de projet du 2026-10-01 (docs/MODULES/pricing.md,
-- docs/PRD_REGLES.md) : le forfait Grande Agence couvre 11 à 30 annonces.
-- Au-delà de 30, deux options : 1 000 XOF par annonce supplémentaire
-- (prix_depassement_unitaire, inchangé) ou une formule personnalisée
-- négociée avec l'admin — modélisée avec subscriptions_keyli, pas ici.
-- Avant cette décision, seuil_max était NULL : le prix de dépassement ne
-- pouvait jamais s'appliquer.

update public.plans_keyli
   set seuil_max = 30
 where code = 'grande_agence';
