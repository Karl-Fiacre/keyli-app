import { z } from 'zod'

// Schémas de validation des formulaires de compte (zod + react-hook-form,
// docs/CONVENTIONS.md). La base revalide tout ce qui compte (rôle, nom
// d'agence) : ces schémas ne servent qu'au confort de saisie.

export const ROLES_INSCRIPTION = ['user', 'owner', 'agency'] as const
export type RoleInscription = (typeof ROLES_INSCRIPTION)[number]

export const LONGUEUR_MIN_MOT_DE_PASSE = 8

const motDePasse = z
  .string()
  .min(LONGUEUR_MIN_MOT_DE_PASSE, `Au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`)
  .max(72, '72 caractères au maximum.')

// Téléphone ivoirien facultatif : +225 suivi de 10 chiffres (espaces tolérés)
const telephone = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\+?225\s?(\d\s?){10}$/.test(v), 'Format attendu : +225 suivi de 10 chiffres.')

export const schemaInscription = z
  .object({
    role: z.enum(ROLES_INSCRIPTION, { error: 'Choisissez un type de compte.' }),
    nomAgence: z.string().trim().optional(),
    prenom: z.string().trim().min(1, 'Votre prénom est requis.').max(80),
    nom: z.string().trim().min(1, 'Votre nom est requis.').max(80),
    telephone,
    email: z.string().trim().email('Adresse email invalide.'),
    motDePasse,
    confirmation: z.string(),
    // Acceptation des CGU obligatoire (version enregistrée par la base)
    cgu: z.boolean().refine((v) => v, 'Vous devez accepter les conditions générales pour créer un compte.'),
  })
  .refine((d) => d.motDePasse === d.confirmation, {
    path: ['confirmation'],
    message: 'Les deux mots de passe ne correspondent pas.',
  })
  .refine((d) => d.role !== 'agency' || !!d.nomAgence, {
    path: ['nomAgence'],
    message: "Le nom de l'agence est obligatoire.",
  })
export type DonneesInscription = z.infer<typeof schemaInscription>

export const schemaConnexion = z.object({
  email: z.string().trim().email('Adresse email invalide.'),
  motDePasse: z.string().min(1, 'Saisissez votre mot de passe.'),
})
export type DonneesConnexion = z.infer<typeof schemaConnexion>

export const schemaEmail = z.object({ email: z.string().trim().email('Adresse email invalide.') })
export type DonneesEmail = z.infer<typeof schemaEmail>

export const schemaNouveauMotDePasse = z
  .object({ motDePasse, confirmation: z.string() })
  .refine((d) => d.motDePasse === d.confirmation, {
    path: ['confirmation'],
    message: 'Les deux mots de passe ne correspondent pas.',
  })
export type DonneesNouveauMotDePasse = z.infer<typeof schemaNouveauMotDePasse>

export const schemaProfil = z.object({
  prenom: z.string().trim().min(1, 'Votre prénom est requis.').max(80),
  nom: z.string().trim().min(1, 'Votre nom est requis.').max(80),
  telephone,
  nomAgence: z.string().trim().optional(),
})
export type DonneesProfil = z.infer<typeof schemaProfil>

// Champ numérique facultatif : une saisie vide vaut « non renseigné »
const nombreFacultatif = (message: string, entier = false) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : Number(v)),
    (entier ? z.number().int(message) : z.number()).min(0, message).optional(),
  )

// Hôtel ou auberge : réservation par types de chambres
export const estHotelier = (t: string | undefined) => t === 'hotel' || t === 'auberge'

export const TYPES_BIEN = [
  'appartement',
  'studio',
  'maison',
  'villa',
  'duplex',
  'residence_meublee',
  'bureau',
  'magasin',
  'auberge',
  'hotel',
] as const

export const LIBELLES_TYPE: Record<(typeof TYPES_BIEN)[number], string> = {
  appartement: 'Appartement',
  studio: 'Studio',
  maison: 'Maison',
  villa: 'Villa',
  duplex: 'Duplex',
  residence_meublee: 'Résidence meublée',
  bureau: 'Bureau',
  magasin: 'Magasin',
  auberge: 'Auberge',
  hotel: 'Hôtel',
}

// Publication d'annonce — confort de saisie ; publier_annonce_keyli revalide
export const schemaAnnonce = z.object({
  titre: z.string().trim().min(1, 'Le titre est requis.').max(120, '120 caractères au maximum.'),
  type: z.enum(TYPES_BIEN, { error: 'Choisissez le type de bien.' }),
  statut: z.enum(['a_louer', 'a_vendre'], { error: 'À louer ou à vendre ?' }),
  prix: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number({ error: 'Le prix est requis.' }).positive('Le prix doit être supérieur à zéro.'),
  ),
  ville: z.string().trim().min(1, 'La ville est requise.').max(80),
  quartierId: z.string().optional(),
  description: z.string().trim().max(2000, '2 000 caractères au maximum.').optional(),
  surface: nombreFacultatif('Surface invalide.'),
  pieces: nombreFacultatif('Nombre de pièces invalide.', true),
  sallesDeBain: nombreFacultatif('Nombre de salles de bain invalide.', true),
  meuble: z.boolean(),
  avantages: z.array(z.string()),
  latitude: z.number({ error: 'Placez le bien sur la carte ou utilisez votre position.' }),
  longitude: z.number({ error: 'Placez le bien sur la carte ou utilisez votre position.' }),
  accepteDepassement: z.boolean(),
  // Séjour court : réservation à la nuit (imposé pour un hôtel ou une auberge à louer)
  sejourCourt: z.boolean(),
  nuitsMin: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : Number(v)),
    z.number().int('Nombre entier.').min(1, 'Au moins 1 nuit.').max(90, '90 nuits au plus.').optional(),
  ),
  voyageursMax: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : Number(v)),
    z.number().int('Nombre entier.').min(1, 'Au moins 1 voyageur.').max(50, '50 voyageurs au plus.').optional(),
  ),
})
export type DonneesAnnonce = z.output<typeof schemaAnnonce>
// Valeurs du formulaire avant validation (champs numériques encore bruts)
export type SaisieAnnonce = z.input<typeof schemaAnnonce>

// Robustesse indicative du mot de passe (PRD : indicateur à l'inscription)
export function robustesseMotDePasse(valeur: string): 0 | 1 | 2 | 3 | 4 {
  if (!valeur) return 0
  let score = 0
  if (valeur.length >= LONGUEUR_MIN_MOT_DE_PASSE) score++
  if (valeur.length >= 12) score++
  if (/[a-z]/.test(valeur) && /[A-Z]/.test(valeur)) score++
  if (/\d/.test(valeur) && /[^A-Za-z0-9]/.test(valeur)) score++
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4
}

// Retour à l'équipe Keyli (mêmes bornes que la base : feedback_keyli)
export const schemaRetour = z.object({
  type: z.enum(['suggestion', 'bug', 'complaint', 'recommendation'], { error: 'Choisissez un type de retour.' }),
  sujet: z.string().trim().min(3, 'Sujet trop court (3 caractères au moins).').max(120, '120 caractères au plus.'),
  message: z
    .string()
    .trim()
    .min(10, 'Message trop court (10 caractères au moins).')
    .max(2000, '2 000 caractères au plus.'),
})
export type DonneesRetour = z.infer<typeof schemaRetour>

// Candidature au pilote (Sprint 5) : la base revalide tout
// (candidater_pilote_keyli). Téléphone obligatoire ici : l'équipe rappelle.
export const PROFILS_PILOTE = ['proprietaire', 'agence', 'chercheur'] as const
export type ProfilPilote = (typeof PROFILS_PILOTE)[number]

export const schemaCandidature = z
  .object({
    profil: z.enum(PROFILS_PILOTE, { error: 'Choisissez votre profil.' }),
    nomAgence: z.string().trim().max(120).optional(),
    prenom: z.string().trim().min(1, 'Votre prénom est requis.').max(80),
    nom: z.string().trim().min(1, 'Votre nom est requis.').max(80),
    telephone: z
      .string()
      .trim()
      .refine((v) => /^\+225\s?(\d\s?){10}$/.test(v), 'Format attendu : +225 suivi de 10 chiffres.'),
    email: z.string().trim().email('Adresse email invalide.').max(254),
    commune: z.string().optional(),
    nbBiens: z.string().optional(),
    message: z.string().trim().max(1000, '1 000 caractères au plus.').optional(),
  })
  .refine((d) => d.profil !== 'agence' || !!d.nomAgence, {
    path: ['nomAgence'],
    message: "Le nom de l'agence est obligatoire.",
  })
  .refine((d) => !d.nbBiens || /^\d{1,5}$/.test(d.nbBiens), {
    path: ['nbBiens'],
    message: 'Indiquez un nombre.',
  })
export type DonneesCandidature = z.infer<typeof schemaCandidature>

// Demande d'aide (Sprint 7) : mêmes bornes que la base
// (envoyer_demande_support_keyli, demandes_support_keyli)
export const SUJETS_SUPPORT = ['compte', 'annonce', 'verification', 'paiement', 'partenariat', 'autre'] as const
export type SujetSupport = (typeof SUJETS_SUPPORT)[number]

export const schemaSupport = z.object({
  nom: z.string().trim().min(1, 'Votre nom est requis.').max(80, '80 caractères au plus.'),
  email: z.string().trim().email('Adresse email invalide.').max(254),
  sujet: z.enum(SUJETS_SUPPORT, { error: 'Choisissez un sujet.' }),
  message: z
    .string()
    .trim()
    .min(10, 'Message trop court (10 caractères au moins).')
    .max(2000, '2 000 caractères au plus.'),
})
export type DonneesSupport = z.infer<typeof schemaSupport>
