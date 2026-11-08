// Client Supabase unique de l'application web — pointe vers le projet dédié
// Keyli. Seules l'URL et la clé anon (publiques) sont utilisées ici : aucune
// clé secrète (service_role, Paystack, Cloudinary) ne doit jamais apparaître
// côté client (docs/STACK.md).
//
// La logique partagée (src/partage) importe ce module : l'application mobile
// fournira le sien, au même chemin, avec sa propre configuration
// (docs/LOGIQUE_PARTAGEE.md). Les pages n'importent jamais ce client
// directement : elles passent par un hook métier (docs/CONVENTIONS.md).
import { creerClientKeyli } from '@/partage/supabase'

export const supabase = creerClientKeyli(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
