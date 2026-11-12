// Retours des utilisateurs (feedback_keyli) — règles communes au web et au
// mobile. La base limite le message à 2 000 caractères.
export const MESSAGE_RETOUR_MAX = 2000

// Ajoute à la fin du message le contexte de l'envoi (ex. « Application
// iPhone 0.1.0 (5), iOS 18.4 ») pour aider l'équipe pendant la bêta
// (Sprint 18). Le texte de la personne n'est jamais coupé : sans place,
// le contexte est omis.
export function messageAvecContexte(message: string, contexte: string | null): string {
  const texte = message.trim()
  if (!contexte) return texte
  const complet = `${texte}\n\n— ${contexte}`
  return complet.length <= MESSAGE_RETOUR_MAX ? complet : texte
}
