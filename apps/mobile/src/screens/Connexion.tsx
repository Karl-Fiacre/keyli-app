// Connexion — même formulaire, même validation et même hook que le web
// (src/pages/Connexion.tsx) : seule l'interface est native.
// Deux présentations :
// - premier écran de l'application (visiteur non connecté, décision du
//   porteur du 2026-11-22) : photos de logements en fond plein écran (celles
//   de l'ancien écran de bienvenue), logo blanc, promesse de Keyli, puis le
//   formulaire sur une carte blanche et « Découvrir les annonces sans
//   compte » (consultation libre) ;
// - fenêtre ouverte depuis l'application : formulaire simple sur fond blanc.
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useConnexion } from '@/partage/hooks/useCompte'
import { schemaConnexion, type DonneesConnexion } from '@/partage/lib/validation'
import { messageErreur } from '@/partage/lib/erreurs'
import { Bouton, Champ, Ecran, Logo, Message, Texte, Titre } from '@mobile/composants/base'
import { DefilementPhotos } from '@mobile/composants/DefilementPhotos'
import { BadgeVerifie } from '@mobile/composants/BadgeVerifie'
import { useExplorer } from '@mobile/navigation/explorer'
import { couleurs, espaces, ombreCarte, polices, rayons } from '@mobile/theme/tokens'
import type { ParamsCompte } from '@mobile/navigation/types'

export default function Connexion({ navigation }: NativeStackScreenProps<ParamsCompte, 'Connexion'>) {
  const connexion = useConnexion()
  const explorer = useExplorer()
  const { control, handleSubmit, formState } = useForm<DonneesConnexion>({
    resolver: zodResolver(schemaConnexion),
    defaultValues: { email: '', motDePasse: '' },
  })

  const envoyer = handleSubmit((d) => connexion.mutate({ email: d.email.trim(), motDePasse: d.motDePasse }))

  const formulaire = (
    <>
      {connexion.isError ? <Message>{messageErreur(connexion.error)}</Message> : null}

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Champ
            libelle="Adresse email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            erreur={formState.errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="motDePasse"
        render={({ field }) => (
          <Champ
            libelle="Mot de passe"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={() => void envoyer()}
            erreur={formState.errors.motDePasse?.message}
          />
        )}
      />

      <Bouton libelle="Se connecter" onPress={envoyer} chargement={connexion.isPending} />
      <Bouton libelle="Mot de passe oublié ?" variante="lien" onPress={() => navigation.navigate('MotDePasseOublie')} />
      <Bouton libelle="Créer un compte" variante="secondaire" onPress={() => navigation.navigate('Inscription')} />
    </>
  )

  // Connexion ouverte en fenêtre depuis l'application
  if (!explorer) {
    return (
      <Ecran centre>
        <View style={{ alignItems: 'center' }}>
          <Logo />
        </View>
        <Titre>Connexion</Titre>
        <Texte attenue>Retrouvez vos annonces, messages et visites.</Texte>
        {formulaire}
      </Ecran>
    )
  }

  // Premier écran de l'application : photos en fond
  return (
    <View style={styles.ecran}>
      <StatusBar style="light" />
      <DefilementPhotos style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.plein} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.plein} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
            <View style={styles.haut}>
              <Logo largeur={150} blanc />
            </View>

            <View style={styles.espace} />

            <Text style={styles.titre} accessibilityRole="header">
              Le logement de confiance, <Text style={{ color: couleurs.turquoise }}>vérifié avant vous.</Text>
            </Text>
            <View style={styles.garantie}>
              <BadgeVerifie taille={22} libelle="Badge de vérification Keyli" />
              <Text style={styles.texteGarantie}>
                Biens vérifiés sur le terrain, contact protégé : votre numéro reste privé.
              </Text>
            </View>

            <View style={styles.carte}>{formulaire}</View>

            <Pressable onPress={explorer} accessibilityRole="button" hitSlop={8} style={styles.explorer}>
              <Text style={styles.texteExplorer}>Découvrir les annonces sans compte</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.navyLogo },
  plein: { flex: 1 },
  contenu: { flexGrow: 1, paddingHorizontal: espaces.xl, paddingBottom: espaces.l, gap: espaces.l },
  haut: { alignItems: 'center', paddingTop: espaces.m },
  espace: { flex: 1, minHeight: espaces.xxl },
  // Ombre légère : texte lisible sur la photo
  titre: {
    fontFamily: polices.titre,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    color: couleurs.surPrimaire,
    textShadowColor: couleurs.navyLogo,
    textShadowRadius: 10,
  },
  garantie: { flexDirection: 'row', alignItems: 'center', gap: espaces.s },
  texteGarantie: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: couleurs.texteClair,
    textShadowColor: couleurs.navyLogo,
    textShadowRadius: 8,
  },
  carte: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.carte,
    padding: espaces.l,
    gap: espaces.m,
    ...ombreCarte,
  },
  explorer: { alignItems: 'center', paddingVertical: espaces.s },
  texteExplorer: { fontSize: 15, fontWeight: '600', color: couleurs.turquoise },
})
