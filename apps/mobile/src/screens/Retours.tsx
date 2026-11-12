// Donner mon avis (Sprint 18, bêta) — même formulaire, même validation et
// mêmes hooks que le web (src/pages/Retours.tsx) : les retours arrivent
// dans le back-office (/admin/retours) et la réponse de l'équipe s'affiche
// ici. La version de l'application et du téléphone est jointe au message
// pour situer un problème signalé par un testeur.
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Platform, Text, View } from 'react-native'
import * as Application from 'expo-application'
import {
  LIBELLES_STATUT_RETOUR,
  LIBELLES_TYPE_RETOUR,
  useEnvoiRetour,
  useMesRetours,
  type StatutRetour,
  type TypeRetour,
} from '@/partage/hooks/useRetours'
import { schemaRetour, type DonneesRetour } from '@/partage/lib/validation'
import { messageAvecContexte } from '@/partage/lib/retours'
import { messageErreur } from '@/partage/lib/erreurs'
import { formatDate } from '@/partage/lib/format'
import { Bouton, Carte, Champ, Choix, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { couleurs, espaces } from '@mobile/theme/tokens'

const TYPES = (Object.entries(LIBELLES_TYPE_RETOUR) as [TypeRetour, string][]).map(([valeur, libelle]) => ({
  valeur,
  libelle,
}))

const COULEUR_STATUT: Record<StatutRetour, string> = {
  pending: couleurs.attenteTexte,
  reviewed: couleurs.bleuLogo,
  resolved: couleurs.succesTexte,
  dismissed: couleurs.attenue,
}

// « Application iPhone 0.1.0 (5), iOS 18.4 »
function contexteAppareil(): string | null {
  if (Platform.OS === 'web') return null
  const appareil = Platform.OS === 'ios' ? 'iPhone' : 'Android'
  const version = Application.nativeApplicationVersion
  const compilation = Application.nativeBuildVersion
  const systeme = `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${String(Platform.Version)}`
  return `Application ${appareil}${version ? ` ${version}` : ''}${compilation ? ` (${compilation})` : ''}, ${systeme}`
}

export default function Retours() {
  const retours = useMesRetours()
  const envoi = useEnvoiRetour()
  const { control, handleSubmit, reset, formState } = useForm<DonneesRetour>({
    resolver: zodResolver(schemaRetour),
    defaultValues: { type: 'suggestion', sujet: '', message: '' },
  })

  const envoyer = handleSubmit((d) =>
    envoi.mutate({ ...d, message: messageAvecContexte(d.message, contexteAppareil()) }, { onSuccess: () => reset() }),
  )

  return (
    <Ecran>
      <Titre>Donner mon avis</Titre>
      <Texte attenue>
        Une idée, un problème, une réclamation ? Votre retour est lu par l'équipe Keyli, qui vous répond ici.
      </Texte>

      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Choix libelle="Type de retour" options={TYPES} valeur={field.value} onChange={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="sujet"
        render={({ field }) => (
          <Champ
            libelle="Sujet"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            maxLength={120}
            erreur={formState.errors.sujet?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="message"
        render={({ field }) => (
          <Champ
            libelle="Message"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            maxLength={1900}
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            erreur={formState.errors.message?.message}
          />
        )}
      />
      {envoi.isError ? <Message>{messageErreur(envoi.error)}</Message> : null}
      {envoi.isSuccess ? <Message type="succes">Merci ! Votre retour a bien été envoyé à l'équipe Keyli.</Message> : null}
      <Bouton libelle="Envoyer" onPress={envoyer} chargement={envoi.isPending} />

      <Titre>Mes retours</Titre>
      {retours.isError ? <Message>{messageErreur(retours.error)}</Message> : null}
      {retours.data?.length === 0 ? <Texte attenue>Vous n'avez encore envoyé aucun retour.</Texte> : null}
      {retours.data?.map((r) => {
        const statut = (r.status ?? 'pending') as StatutRetour
        return (
          <Carte key={r.id} style={{ gap: espaces.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: espaces.s }}>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: couleurs.texte }}>{r.subject}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COULEUR_STATUT[statut] }}>
                {LIBELLES_STATUT_RETOUR[statut]}
              </Text>
            </View>
            <Texte attenue>
              {LIBELLES_TYPE_RETOUR[(r.type ?? 'suggestion') as TypeRetour]}
              {r.created_at ? ` · ${formatDate(r.created_at)}` : ''}
            </Texte>
            <Texte>{r.message}</Texte>
            {r.admin_response ? (
              <View
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: couleurs.bleuLogo,
                  backgroundColor: couleurs.secondaire,
                  padding: espaces.m,
                  gap: espaces.xs,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: couleurs.bleuLogo }}>
                  Réponse de l'équipe Keyli
                </Text>
                <Texte>{r.admin_response}</Texte>
              </View>
            ) : null}
          </Carte>
        )
      })}
    </Ecran>
  )
}
