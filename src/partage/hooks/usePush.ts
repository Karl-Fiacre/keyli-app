// Appareils push du compte connecté (Sprint 17, docs/MODULES/mobile.md) :
// le téléphone enregistre son jeton Apple / Google à la connexion et le
// retire à la déconnexion. L'envoi est fait par le serveur (file
// pushs_sortants_keyli, Edge Function envoyer-pushs).
import { supabase } from '@/integrations/supabase/client'

export type PlateformePush = 'ios' | 'android'
export type EnvironnementPush = 'production' | 'sandbox'

export async function enregistrerAppareilPush(
  jeton: string,
  plateformePush: PlateformePush,
  environnement: EnvironnementPush,
) {
  const { error } = await supabase.rpc('enregistrer_appareil_push_keyli', {
    p_jeton: jeton,
    p_plateforme: plateformePush,
    p_environnement: environnement,
  })
  if (error) throw error
}

// À appeler AVANT la déconnexion (la règle d'accès exige la session)
export async function retirerAppareilPush(jeton: string) {
  const { error } = await supabase.from('appareils_push_keyli').delete().eq('jeton', jeton)
  if (error) throw error
}
