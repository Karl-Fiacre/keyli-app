import { BanniereAccueil } from '@/components/accueil/BanniereAccueil'
import { CatalogueAccueil } from '@/components/accueil/CatalogueAccueil'
import { ExplorerCommunes } from '@/components/accueil/ExplorerCommunes'

// Accueil public (registre « chaleureux » de DESIGN_SYSTEM.md : turquoise,
// titres Cambria, rayon accueil). Page composée de blocs indépendants dans
// src/components/accueil/ ; toutes les données affichées viennent de la base
// (annonces, communes) — aucun chiffre ni annonce fictifs.
// Depuis le 2026-11-04 (décision du porteur) : l'accueil garde la recherche,
// le catalogue (liste ou carte) et les communes ; la présentation (parcours,
// annonceurs, vision) est dans la page À propos (src/pages/APropos.tsx).
export default function Accueil() {
  return (
    <>
      <BanniereAccueil />
      <CatalogueAccueil />
      <ExplorerCommunes />
    </>
  )
}
