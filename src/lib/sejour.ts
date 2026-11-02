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
