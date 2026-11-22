// Connexion avec Google, Apple ou Facebook (demande du porteur, 2026-11-22).
// La session reste créée par Supabase Auth : l'application ne fait que
// récupérer la preuve d'identité du fournisseur.
// - iPhone + Apple : fenêtre native « Se connecter avec Apple »
//   (expo-apple-authentication), jeton remis à Supabase (signInWithIdToken).
// - Autres cas : page du fournisseur ouverte dans le navigateur sécurisé du
//   téléphone, retour dans l'application par keyli://auth.
// Un nouveau compte reçoit le rôle « user » (trigger handle_new_user_keyli)
// et passe par l'écran d'acceptation des CGU au premier lancement.
import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/integrations/supabase/client'

export type FournisseurSocial = 'google' | 'apple' | 'facebook'

// Adresse de retour : à autoriser dans Supabase (Authentication > URL Configuration)
export const ADRESSE_RETOUR = 'keyli://auth'

// Erreur « abandon » : la personne a fermé la fenêtre, rien à afficher
export class ConnexionAnnulee extends Error {
  constructor() {
    super('Connexion annulée')
  }
}

export async function appleDisponible() {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync())
}

async function connexionAppleNative() {
  // Le nonce brut va à Supabase, son empreinte SHA-256 à Apple
  const nonce = Crypto.randomUUID()
  const empreinte = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce)
  let reponse: AppleAuthentication.AppleAuthenticationCredential
  try {
    reponse = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: empreinte,
    })
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new ConnexionAnnulee()
    throw e
  }
  if (!reponse.identityToken) throw new Error("Apple n'a pas renvoyé d'identité. Réessayez.")
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: reponse.identityToken,
    nonce,
  })
  if (error) throw error
  // Apple ne donne le nom qu'à la toute première connexion, et hors du jeton :
  // on le recopie dans le profil s'il est encore vide (RLS : son propre profil)
  const prenom = reponse.fullName?.givenName
  const nom = reponse.fullName?.familyName
  const { data: session } = await supabase.auth.getUser()
  if ((prenom || nom) && session.user) {
    await supabase
      .from('profiles_keyli')
      .update({ first_name: prenom ?? null, last_name: nom ?? null })
      .eq('user_id', session.user.id)
      .is('first_name', null)
  }
}

// Lit les paramètres de l'adresse de retour (après « ? » ou « # »)
function parametres(adresse: string) {
  const sortie = new Map<string, string>()
  const parties = adresse.split(/[?#]/).slice(1).join('&')
  for (const paire of parties.split('&')) {
    const [cle, valeur] = paire.split('=')
    if (cle) sortie.set(decodeURIComponent(cle), decodeURIComponent((valeur ?? '').replace(/\+/g, ' ')))
  }
  return sortie
}

async function connexionNavigateur(fournisseur: FournisseurSocial) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: fournisseur,
    options: {
      redirectTo: ADRESSE_RETOUR,
      skipBrowserRedirect: true,
      scopes: fournisseur === 'facebook' ? 'email public_profile' : undefined,
    },
  })
  if (error) throw error
  const resultat = await WebBrowser.openAuthSessionAsync(data.url, ADRESSE_RETOUR)
  if (resultat.type !== 'success') throw new ConnexionAnnulee()

  const p = parametres(resultat.url)
  const erreur = p.get('error_description') ?? p.get('error')
  if (erreur) throw new Error(erreur)
  const code = p.get('code')
  if (code) {
    const { error: e } = await supabase.auth.exchangeCodeForSession(code)
    if (e) throw e
    return
  }
  const access_token = p.get('access_token')
  const refresh_token = p.get('refresh_token')
  if (!access_token || !refresh_token) throw new Error('La connexion a échoué. Réessayez.')
  const { error: e } = await supabase.auth.setSession({ access_token, refresh_token })
  if (e) throw e
}

export async function connexionSociale(fournisseur: FournisseurSocial) {
  if (fournisseur === 'apple' && (await appleDisponible())) return connexionAppleNative()
  return connexionNavigateur(fournisseur)
}
