import { z } from 'zod'

// Double authentification des admins (docs/MODULES/admin.md) : règles
// pures, communes au web et au mobile.

export const schemaCodeTotp = z.object({
  // Espaces et tirets tolérés : le code est nettoyé avant envoi
  code: z
    .string()
    .refine((s) => codeTotpValide(nettoyerCodeTotp(s)), 'Saisissez les 6 chiffres affichés par l’application.'),
})
export type DonneesCodeTotp = z.infer<typeof schemaCodeTotp>

// Ne garde que les chiffres saisis (espaces, tirets, collage depuis
// l'application), 6 au plus
export function nettoyerCodeTotp(saisie: string): string {
  return saisie.replace(/\D/g, '').slice(0, 6)
}

// Un code TOTP complet : exactement 6 chiffres
export function codeTotpValide(code: string): boolean {
  return /^\d{6}$/.test(code)
}

// La clé secrète en groupes de 4 caractères, plus facile à recopier à la
// main dans l'application d'authentification
export function grouperSecret(secret: string): string {
  return secret.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') ?? ''
}
