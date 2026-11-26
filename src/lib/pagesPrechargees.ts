// Pages chargées à la demande qu'on précharge avant d'y aller : la
// transition partagée (src/lib/cinema.ts) a besoin que la page d'arrivée
// s'affiche aussitôt, pas un écran de chargement. App.tsx et les cartes
// utilisent les mêmes fonctions, donc le même fichier téléchargé.
export const chargerFicheAnnonce = () => import('@/pages/FicheAnnonce')
export const chargerRecherche = () => import('@/pages/Recherche')
