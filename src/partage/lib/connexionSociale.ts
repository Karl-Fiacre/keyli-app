// Fournisseurs de connexion proposés sur le web et le mobile (2026-11-23).
// Facebook est masqué tant que Meta n'a pas validé l'app (vérification
// d'entreprise + Contrôle app, en attente de l'immatriculation de
// Nguessan-IT) : sans cela, seuls les comptes ayant un rôle dans l'app Meta
// peuvent se connecter. Le remettre à true une fois l'app publiée chez Meta.
export const FACEBOOK_ACTIF = false

export type FournisseurSocial = 'google' | 'apple' | 'facebook'

export const FOURNISSEURS_SOCIAUX: { id: FournisseurSocial; nom: string }[] = [
  { id: 'google', nom: 'Google' },
  { id: 'apple', nom: 'Apple' },
  ...(FACEBOOK_ACTIF ? [{ id: 'facebook' as const, nom: 'Facebook' }] : []),
]
