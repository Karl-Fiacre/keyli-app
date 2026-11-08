// Ouverture d'un document privé dans un nouvel onglet (web seulement)
import { lienDocumentTemporaire } from '@/partage/hooks/useAdmin'

export async function ouvrirDocument(chemin: string) {
  window.open(await lienDocumentTemporaire(chemin), '_blank', 'noopener,noreferrer')
}
