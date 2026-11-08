// Mot de passe oublié — le lien reçu par email s'ouvre sur le site Keyli,
// qui gère le choix du nouveau mot de passe (même hook que le web).
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDemandeReinitialisation } from '@/partage/hooks/useCompte'
import { schemaEmail, type DonneesEmail } from '@/partage/lib/validation'
import { messageErreur } from '@/partage/lib/erreurs'
import { Bouton, Champ, Ecran, Message, Texte, Titre } from '@mobile/composants/base'

export default function MotDePasseOublie() {
  const demande = useDemandeReinitialisation()
  const [envoye, setEnvoye] = useState(false)
  const { control, handleSubmit, formState } = useForm<DonneesEmail>({
    resolver: zodResolver(schemaEmail),
    defaultValues: { email: '' },
  })
  const envoyer = handleSubmit((d) => demande.mutate(d.email.trim(), { onSuccess: () => setEnvoye(true) }))

  return (
    <Ecran centre>
      <Titre>Mot de passe oublié</Titre>
      {envoye ? (
        <Message type="succes">
          Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé. Ouvrez-le pour
          choisir un nouveau mot de passe.
        </Message>
      ) : (
        <>
          <Texte attenue>Indiquez votre adresse : nous vous envoyons un lien pour choisir un nouveau mot de passe.</Texte>
          {demande.isError ? <Message>{messageErreur(demande.error)}</Message> : null}
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
                keyboardType="email-address"
                autoComplete="email"
                erreur={formState.errors.email?.message}
              />
            )}
          />
          <Bouton libelle="Envoyer le lien" onPress={envoyer} chargement={demande.isPending} />
        </>
      )}
    </Ecran>
  )
}
