// Inscription — même schéma (rôle, identité, CGU) et même hook que le web.
// La base crée le profil et n'enregistre la version des CGU que si c'est
// celle en vigueur (docs/MODULES/juridique.md).
import { useState, type ComponentProps } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Linking, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useInscription } from '@/partage/hooks/useCompte'
import { schemaInscription, type DonneesInscription, type RoleInscription } from '@/partage/lib/validation'
import { messageErreur } from '@/partage/lib/erreurs'
import { plateforme } from '@/plateforme'
import { Bouton, CaseACocher, Champ, Choix, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { couleurs } from '@mobile/theme/tokens'
import type { ParamsCompte } from '@mobile/navigation/types'

const ROLES: readonly { valeur: RoleInscription; libelle: string }[] = [
  { valeur: 'user', libelle: 'Je cherche un logement' },
  { valeur: 'owner', libelle: 'Propriétaire' },
  { valeur: 'agency', libelle: 'Agence' },
]

export default function Inscription({ navigation }: NativeStackScreenProps<ParamsCompte, 'Inscription'>) {
  const inscription = useInscription()
  const [emailEnvoye, setEmailEnvoye] = useState<string | null>(null)
  const { control, handleSubmit, watch, formState } = useForm<DonneesInscription>({
    resolver: zodResolver(schemaInscription),
    defaultValues: {
      role: 'user',
      nomAgence: '',
      prenom: '',
      nom: '',
      telephone: '',
      email: '',
      motDePasse: '',
      confirmation: '',
      cgu: false,
    },
  })
  const role = watch('role')
  const e = formState.errors

  const envoyer = handleSubmit((d) =>
    inscription.mutate(d, { onSuccess: () => setEmailEnvoye(d.email.trim()) }),
  )

  if (emailEnvoye) {
    return (
      <Ecran centre>
        <Titre>Vérifiez votre boîte mail</Titre>
        <Texte>
          Un lien de confirmation a été envoyé à {emailEnvoye}. Ouvrez-le pour activer votre compte, puis revenez vous
          connecter.
        </Texte>
        <Bouton libelle="Aller à la connexion" onPress={() => navigation.navigate('Connexion')} />
      </Ecran>
    )
  }

  const champ = (
    nom: 'prenom' | 'nom' | 'telephone' | 'email' | 'motDePasse' | 'confirmation' | 'nomAgence',
    libelle: string,
    options: Partial<ComponentProps<typeof Champ>> = {},
  ) => (
    <Controller
      control={control}
      name={nom}
      render={({ field }) => (
        <Champ
          libelle={libelle}
          value={field.value ?? ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          erreur={e[nom]?.message}
          {...options}
        />
      )}
    />
  )

  return (
    <Ecran>
      <Titre>Créer un compte</Titre>
      <Texte attenue>Gratuit pour chercher un logement. Les annonceurs sont vérifiés par Keyli.</Texte>

      {inscription.isError ? <Message>{messageErreur(inscription.error)}</Message> : null}

      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <Choix libelle="Type de compte" options={ROLES} valeur={field.value} onChange={field.onChange} />
        )}
      />
      {role === 'agency' ? champ('nomAgence', "Nom de l'agence") : null}
      {champ('prenom', 'Prénom', { autoComplete: 'given-name', textContentType: 'givenName' })}
      {champ('nom', 'Nom', { autoComplete: 'family-name', textContentType: 'familyName' })}
      {champ('telephone', 'Téléphone (facultatif)', {
        keyboardType: 'phone-pad',
        placeholder: '+225 07 00 00 00 00',
        autoComplete: 'tel',
      })}
      {champ('email', 'Adresse email', {
        autoCapitalize: 'none',
        keyboardType: 'email-address',
        autoComplete: 'email',
        textContentType: 'emailAddress',
      })}
      {champ('motDePasse', 'Mot de passe (8 caractères minimum)', {
        secureTextEntry: true,
        autoComplete: 'new-password',
        textContentType: 'newPassword',
      })}
      {champ('confirmation', 'Confirmer le mot de passe', { secureTextEntry: true, textContentType: 'newPassword' })}

      <Controller
        control={control}
        name="cgu"
        render={({ field }) => (
          <CaseACocher coche={field.value} onChange={field.onChange} erreur={e.cgu?.message}>
            <Text style={{ color: couleurs.texte, fontSize: 15, lineHeight: 21 }}>
              J'accepte les{' '}
              <Text
                style={{ color: couleurs.bleuLogo, textDecorationLine: 'underline' }}
                onPress={() => void Linking.openURL(plateforme.urlApp('/conditions'))}
              >
                conditions générales d'utilisation
              </Text>{' '}
              et la{' '}
              <Text
                style={{ color: couleurs.bleuLogo, textDecorationLine: 'underline' }}
                onPress={() => void Linking.openURL(plateforme.urlApp('/confidentialite'))}
              >
                politique de confidentialité
              </Text>
              .
            </Text>
          </CaseACocher>
        )}
      />

      <Bouton libelle="Créer mon compte" onPress={envoyer} chargement={inscription.isPending} />
      <Bouton libelle="J'ai déjà un compte" variante="lien" onPress={() => navigation.navigate('Connexion')} />
    </Ecran>
  )
}
