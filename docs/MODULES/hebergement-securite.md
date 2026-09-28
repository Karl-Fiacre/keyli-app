# MODULE : Hébergement & sécurité Cloudflare

## Recommandation (à confirmer, pas encore actée)
Puisque Cloudflare est voulu pour la sécurité, **héberger directement sur
Cloudflare Pages** plutôt que sur un autre hébergeur avec Cloudflare en
proxy devant. Raison : Keyli est une SPA React/Vite (build statique) —
Cloudflare Pages la sert nativement, sans couche de proxy supplémentaire à
maintenir, et WAF/Bot Management/Turnstile sont natifs à la même plateforme.

Si un hébergeur spécifique (Vercel, Netlify) est préféré pour une autre
raison (habitude, intégration particulière), Cloudflare peut rester en
façade en mode proxy (DNS orange-cloud) — ça marche, mais ajoute une couche
de configuration en plus pour un bénéfice équivalent. À trancher avec le
fondateur, pas par défaut technique.

## Ce que Cloudflare protège réellement — et ce qu'il NE protège PAS
⚠️ Point à ne pas laisser dans le flou : Cloudflare en façade du site React
protège le **domaine et l'app front** (DDoS, WAF, bots sur les pages servies
par Cloudflare). Il ne protège **pas automatiquement** les appels directs du
navigateur vers `*.supabase.co` — ce sont des requêtes vers un domaine tiers
que Cloudflare ne voit pas passer. La vraie protection de l'API Supabase
reste Row-Level Security + logique des Edge Functions (voir DATABASE.md,
STRUCTURE_BACKEND.md), pas Cloudflare. Ne pas présenter "sécurisé avec
Cloudflare" comme une protection de la base de données — c'en est une pour
le site, pas pour l'API.

## Prérequis pour activer Cloudflare (quel que soit l'hébergeur choisi)
- [ ] Domaine (`keyli.com`) ajouté à Cloudflare, nameservers changés chez le
      registrar vers ceux de Cloudflare
- [ ] Certificat SSL/TLS géré par Cloudflare (mode "Full strict" recommandé,
      pas "Flexible" — évite un maillon non chiffré entre Cloudflare et
      l'origine)

## Fonctionnalités à activer
```
WAF (Web Application Firewall)  → règles managées de base, gratuites sur
                                   le plan Free de Cloudflare
Rate Limiting                    → limiter les tentatives sur /auth,
                                   formulaire d'inscription pilote, et tout
                                   endpoint Edge Function exposé publiquement
Turnstile (CAPTCHA)              → à intégrer sur Auth.tsx (inscription) et
                                   le formulaire d'inscription pilote —
                                   complète signup_attempts_keyli (table du
                                   schéma cible, à créer — anti-abus déjà
                                   pensé côté produit, Turnstile le renforce
                                   côté réseau)
Bot Management                   → plan payant, pas nécessaire au lancement
                                   pilote (500 propriétés) — à réévaluer à
                                   l'échelle nationale (Phase 4)
Cache Rules                      → assets statiques (images Cloudinary déjà
                                   optimisées séparément — ne pas dupliquer
                                   la mise en cache, Cloudflare cache le
                                   HTML/JS/CSS du build, pas les médias déjà
                                   servis par Cloudinary)
```

## Règles
- [ ] Ne jamais placer de clé secrète (Supabase service_role, Paystack,
      Cloudinary API secret) dans une Cloudflare Page Function sans les
      déclarer en variable d'environnement chiffrée du projet Cloudflare —
      jamais en dur dans le code déployé
- [ ] Turnstile est un ajout de sécurité, pas un remplacement de la
      vérification email obligatoire (MODULES/auth.md) — les deux coexistent
