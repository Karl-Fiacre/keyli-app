// Connexion — même formulaire, même validation et même hook que le web
// (src/pages/Connexion.tsx) : seule l'interface est native.
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useConnexion } from '@/partage/hooks/useCompte'
import { schemaConnexion, type DonneesConnexion } from '@/partage/lib/validation'
import { messageErreur } from '@/partage/lib/erreurs'
import { Bouton, Champ, Ecran, Logo, Message, Texte, Titre } from '@mobile/composants/base'
import type { ParamsCompte } from '@mobile/navigation/types'

export default function Connexion({ navigation }: NativeStackScreenProps<ParamsCompte, 'Connexion'>) {
  const connexion = useConnexion()
  const { control, handleSubmit, formState } = useForm<DonneesConnexion>({
    resolver: zodResolver(schemaConnexion),
    defaultValues: { email: '', motDePasse: '' },
  })

  const envoyer = handleSubmit((d) => connexion.mutate({ email: d.email.trim(), motDePasse: d.motDePasse }))

  return (
    <Ecran centre>
      <View style={{ alignItems: 'center' }}>
        <Logo />
      </View>
      <Titre>Connexion</Titre>
      <Texte attenue>Retrouvez vos annonces, messages et visites.</Texte>

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
    </Ecran>
  )
}
