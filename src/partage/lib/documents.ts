// Documents de vérification — règles communes au web et au mobile
// (docs/MODULES/verification.md). Le bucket privé documents_keyli refuse
// lui-même ce qui dépasse ces limites ; ces contrôles ne servent qu'à donner
// un message clair avant l'envoi.

// Limites du bucket privé (refus côté serveur)
export const TAILLE_MAX = 5 * 1024 * 1024
export const FORMATS = ['application/pdf', 'image/jpeg', 'image/png']

// Pièces à fournir selon le rôle : propriétaire = extrait de naissance +
// certificat de résidence ; agence = registre de commerce (obligatoire pour
// publier). L'ACD se dépose bien par bien.
export const PIECES_COMPTE = {
  owner: ['extrait_naissance', 'cert_residence'],
  agency: ['registre'],
} as const

// Message d'erreur si le fichier ne peut pas être envoyé, sinon null
export function controleDocument(format: string, taille: number): string | null {
  if (!FORMATS.includes(format)) return 'Format accepté : PDF, JPEG ou PNG.'
  if (taille > TAILLE_MAX) return 'Fichier trop lourd : 5 Mo au maximum.'
  if (taille <= 0) return 'Fichier vide : choisissez un autre document.'
  return null
}

// Chemin du fichier dans le bucket : toujours dans le dossier de
// l'utilisateur (la règle d'accès du bucket l'exige)
export function cheminDocument(userId: string, type: string, id: string, format: string): string {
  const extension = format === 'application/pdf' ? 'pdf' : format === 'image/png' ? 'png' : 'jpg'
  return `${userId}/${type}-${id}.${extension}`
}
