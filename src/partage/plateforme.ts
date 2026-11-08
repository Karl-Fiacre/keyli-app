// Contrat entre la logique partagée (src/partage) et chaque application
// (site web aujourd'hui, React Native demain — docs/LOGIQUE_PARTAGEE.md).
//
// Le code partagé n'accède jamais directement au navigateur ni au
// téléphone : il passe par ces services, que chaque application fournit
// dans son module `@/plateforme` (web : src/plateforme/index.ts).

export interface Plateforme {
  // Stockage local durable et SYNCHRONE, propre à l'appareil
  // (web : localStorage ; mobile : MMKV, pas AsyncStorage qui est asynchrone).
  // Ne lève jamais : une lecture impossible renvoie null, une écriture
  // impossible est ignorée.
  stockage: {
    lire(cle: string): string | null
    ecrire(cle: string, valeur: string): void
  }
  // Adresse publique d'une page du site Keyli (liens envoyés par email :
  // confirmation d'adresse, mot de passe oublié). Le mobile renvoie l'adresse
  // du site ou un lien universel qui ouvre l'application.
  urlApp(chemin: string): string
  // Identifiant aléatoire unique (UUID v4)
  nouvelId(): string
}
