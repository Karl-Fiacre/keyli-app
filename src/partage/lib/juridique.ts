// Textes légaux : versionnés dans le code (décision du porteur, 2026-11-04).
// Publier une nouvelle version des CGU = changer VERSION_CGU ici ET la
// fonction public.version_cgu_keyli() par une migration (les deux doivent
// rester identiques : la base refuse toute autre version). Les comptes
// devront alors accepter la nouvelle version à leur prochaine connexion.
export const VERSION_CGU = '2026-11-04'

// Date lisible de la version (affichée en tête des pages légales)
export const DATE_VERSION_CGU = '4 novembre 2026'

// Adresse de contact unique (pas encore active : domaine keyli.com à mettre en service)
export const EMAIL_CONTACT = 'contact@keyli.com'

// Pages légales : restent accessibles même quand l'acceptation est demandée
export const PAGES_JURIDIQUES = ['/conditions', '/confidentialite', '/mentions-legales', '/aide']
