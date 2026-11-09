// Dates de séjour au format de la base (« AAAA-MM-JJ », jour local, sans
// heure) — jamais de Date.toISOString(), qui décale d'un jour selon le fuseau.

const deux = (n: number) => String(n).padStart(2, '0')

export const isoJour = (d: Date) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`

export function jourDepuisIso(iso: string): Date {
  const [a, m, j] = iso.split('-').map(Number)
  return new Date(a, m - 1, j)
}

export const aujourdhuiIso = () => isoJour(new Date())

export function ajouterJours(iso: string, n: number): string {
  const d = jourDepuisIso(iso)
  d.setDate(d.getDate() + n)
  return isoJour(d)
}

// Nombre de nuits entre deux dates (départ − arrivée)
export function nuitsEntre(arrivee: string, depart: string): number {
  return Math.round((jourDepuisIso(depart).getTime() - jourDepuisIso(arrivee).getTime()) / 86_400_000)
}

export const isoValide = (v: string | null | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(jourDepuisIso(v).getTime())

// « mer. 12 nov. »
export const formatJourCourt = (iso: string) =>
  jourDepuisIso(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

// « 12 novembre 2026 »
export const formatJourLong = (iso: string) =>
  jourDepuisIso(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

// ------------------------------------------------------------
// Calendrier de séjour (web : CalendrierSejour, mobile : CalendrierSejour)
// ------------------------------------------------------------

// Premier jour du mois décalé de n mois (« AAAA-MM-01 »)
export function ajouterMois(mois: string, n: number): string {
  const d = jourDepuisIso(mois)
  return isoJour(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

// Premier jour du mois contenant ce jour
export const premierDuMois = (iso: string) => {
  const d = jourDepuisIso(iso)
  return isoJour(new Date(d.getFullYear(), d.getMonth(), 1))
}

// Grille d'un mois, lundi en premier : nombre de cases vides avant le 1er,
// puis les jours du mois
export function grilleMois(mois: string): { decalage: number; jours: string[] } {
  const d = jourDepuisIso(mois)
  const nbJours = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return {
    decalage: (d.getDay() + 6) % 7,
    jours: Array.from({ length: nbJours }, (_, i) => isoJour(new Date(d.getFullYear(), d.getMonth(), i + 1))),
  }
}

// Choix d'un jour : 1er choix = arrivée, 2e choix (plus tard) = départ ; un
// nouveau choix après un séjour complet, ou avant l'arrivée, recommence
export function choisirJourSejour(
  arrivee: string | null,
  depart: string | null,
  jour: string,
): { arrivee: string; depart: string | null } {
  if (!arrivee || depart || jour <= arrivee) return { arrivee: jour, depart: null }
  return { arrivee, depart: jour }
}
