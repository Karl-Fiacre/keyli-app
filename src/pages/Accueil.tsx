import { BanniereAccueil } from '@/components/accueil/BanniereAccueil'
import { AnnoncesVedette } from '@/components/accueil/AnnoncesVedette'
import { ParcoursConfiance } from '@/components/accueil/ParcoursConfiance'
import { ExplorerCommunes } from '@/components/accueil/ExplorerCommunes'
import { EspaceAnnonceurs } from '@/components/accueil/EspaceAnnonceurs'
import { BandeauVision } from '@/components/accueil/BandeauVision'

// Accueil public (registre « chaleureux » de DESIGN_SYSTEM.md : turquoise,
// titres Cambria, rayon accueil). Page composée de blocs indépendants dans
// src/components/accueil/ ; toutes les données affichées viennent de la base
// (annonces, communes) — aucun chiffre ni annonce fictifs.
export default function Accueil() {
  return (
    <>
      <BanniereAccueil />
      <AnnoncesVedette />
      <ParcoursConfiance />
      <ExplorerCommunes />
      <EspaceAnnonceurs />
      <BandeauVision />
    </>
  )
}
