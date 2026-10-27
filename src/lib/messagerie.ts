// Chemin d'une conversation : /messages/<bien ou « direct »>/<interlocuteur>
export const cheminConversation = (c: { property_id: string | null; interlocuteur: string }) =>
  `/messages/${c.property_id ?? 'direct'}/${c.interlocuteur}`
