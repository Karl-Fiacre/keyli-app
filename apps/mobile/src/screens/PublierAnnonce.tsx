// Publication d'une annonce depuis le téléphone (Sprint 15) — même schéma
// de saisie, même état du forfait et même publication atomique que le web
// (src/pages/PublierAnnonce.tsx, docs/MODULES/annonces.md). Nouveauté du
// mobile : photos prises avec la caméra et emplacement par la position du
// téléphone. La base refait tous les contrôles (forfait KY001 à KY004,
// photos 1 à 10, point GPS) : l'écran ne fait qu'accompagner la saisie.
import { useState, type ComponentProps } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Linking, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  useAvantages,
  useEtatPublication,
  usePublierAnnonce,
  useQuartiers,
  type TypeBien,
} from '@/partage/hooks/useAnnonces'
import { useProfil } from '@/partage/hooks/useProfil'
import { useSession } from '@/partage/hooks/useSession'
import { messageErreur } from '@/partage/lib/erreurs'
import { formatXof } from '@/partage/lib/format'
import { publicationPossible } from '@/partage/lib/publication'
import {
  estHotelier,
  LIBELLES_TYPE,
  schemaAnnonce,
  TYPES_BIEN,
  type DonneesAnnonce,
  type SaisieAnnonce,
} from '@/partage/lib/validation'
import { plateforme } from '@/plateforme'
import {
  Bouton,
  CaseACocher,
  Carte,
  Champ,
  Chargement,
  Choix,
  ChoixMultiple,
  Ecran,
  Message,
  Texte,
  Titre,
} from '@mobile/composants/base'
import { GrillePhotos } from '@mobile/composants/GrillePhotos'
import { InvitationConnexion } from '@mobile/composants/InvitationConnexion'
import { Selecteur } from '@mobile/composants/Selecteur'
import { SelecteurPosition } from '@mobile/composants/SelecteurPosition'
import { envoyerPhotos, type PhotoLocale } from '@mobile/services/native/photos'
import { couleurs, espaces } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

const TYPES = TYPES_BIEN.map((t) => ({ valeur: t, libelle: LIBELLES_TYPE[t] }))
const TRANSACTIONS = [
  { valeur: 'a_louer', libelle: 'À louer' },
  { valeur: 'a_vendre', libelle: 'À vendre' },
] as const
const CATEGORIES = [
  { code: 'equipement', titre: 'Équipements' },
  { code: 'proximite', titre: 'À proximité' },
] as const

type Props = NativeStackScreenProps<ParamsRacine, 'PublierAnnonce'>

export default function PublierAnnonce({ navigation }: Props) {
  const { session } = useSession()
  const profil = useProfil()
  const etat = useEtatPublication()
  const avantages = useAvantages()
  const quartiers = useQuartiers()
  const publication = usePublierAnnonce()
  const [photos, setPhotos] = useState<PhotoLocale[]>([])
  const [erreurPhotos, setErreurPhotos] = useState<string>()
  const [progression, setProgression] = useState<number | null>(null)
  const [publiee, setPubliee] = useState<string | null>(null)

  const { control, handleSubmit, watch, setValue, reset, formState } = useForm<
    SaisieAnnonce,
    unknown,
    DonneesAnnonce
  >({
    resolver: zodResolver(schemaAnnonce),
    defaultValues: {
      titre: '',
      statut: 'a_louer',
      ville: 'Abidjan',
      description: '',
      meuble: false,
      avantages: [],
      accepteDepassement: false,
      sejourCourt: false,
    },
  })
  const e = formState.errors

  const role = profil.data?.role_keyli
  // Sans session, les requêtes restent en attente : on l'écarte d'abord
  if (!session) {
    return (
      <InvitationConnexion
        titre="Publier une annonce"
        texte="Connectez-vous avec votre compte propriétaire ou agence pour publier une annonce."
      />
    )
  }
  if (profil.isPending) return <Chargement />
  if (role !== 'owner' && role !== 'agency') {
    return (
      <Ecran>
        <Titre>Publier une annonce</Titre>
        <Message>La publication d'annonces est réservée aux propriétaires et aux agences.</Message>
      </Ecran>
    )
  }
  if (etat.isPending) return <Chargement />
  if (etat.isError || !etat.data) {
    return (
      <Ecran>
        <Message>{messageErreur(etat.error)}</Message>
      </Ecran>
    )
  }

  // Annonce publiée : accès direct à sa fiche
  if (publiee) {
    return (
      <Ecran centre>
        <Titre>Annonce publiée</Titre>
        <Texte>
          Votre annonce est visible dès maintenant. Le badge « Vérifié » s'affichera après le contrôle de vos
          documents par l'équipe Keyli.
        </Texte>
        <Bouton libelle="Voir mon annonce" onPress={() => navigation.replace('FicheAnnonce', { id: publiee })} />
        <Bouton
          libelle="Publier une autre annonce"
          variante="secondaire"
          onPress={() => {
            reset()
            setPhotos([])
            setPubliee(null)
          }}
        />
      </Ecran>
    )
  }

  const f = etat.data
  const possible = publicationPossible(f.statut)
  const depassement = f.statut === 'depassement'
  const accord = watch('accepteDepassement')
  const statut = watch('statut')
  const hotelier = estHotelier(watch('type'))
  // Hôtel ou auberge à louer : toujours à la nuit (la base l'impose aussi)
  const sejour = statut === 'a_louer' && (hotelier || !!watch('sejourCourt'))
  const latitude = watch('latitude')
  const longitude = watch('longitude')

  const photosManquantes = () => {
    if (photos.length > 0) return false
    setErreurPhotos('Ajoutez au moins une photo du bien.')
    return true
  }

  const publier = handleSubmit(async (d) => {
    if (photosManquantes()) return
    setErreurPhotos(undefined)
    let adresses: string[]
    try {
      setProgression(0)
      adresses = await envoyerPhotos(photos, setProgression)
    } catch (err) {
      setErreurPhotos(messageErreur(err))
      setProgression(null)
      return
    }
    publication.mutate(
      {
        ...d,
        quartierId: d.quartierId || null,
        accepteDepassement: depassement && d.accepteDepassement,
        sejourCourt: d.statut === 'a_louer' && (d.sejourCourt || estHotelier(d.type)),
        photos: adresses,
      },
      {
        onSuccess: (id) => setPubliee(id),
        onSettled: () => setProgression(null),
      },
    )
  }, photosManquantes)

  const envoiEnCours = progression !== null || publication.isPending

  // Champ texte relié au formulaire (les nombres restent du texte jusqu'à la validation)
  const champ = (
    nom: 'titre' | 'prix' | 'ville' | 'description' | 'surface' | 'pieces' | 'sallesDeBain' | 'nuitsMin' | 'voyageursMax',
    libelle: string,
    options: Partial<ComponentProps<typeof Champ>> = {},
  ) => (
    <Controller
      control={control}
      name={nom}
      render={({ field }) => (
        <Champ
          libelle={libelle}
          value={field.value === undefined || field.value === null ? '' : String(field.value)}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          erreur={e[nom]?.message}
          editable={!envoiEnCours}
          {...options}
        />
      )}
    />
  )

  const nombre = { keyboardType: 'number-pad' as const }

  return (
    <Ecran>
      <Titre>Publier une annonce</Titre>
      <Texte attenue>
        Votre annonce est visible dès sa publication ; le badge « Vérifié » s'affiche après contrôle de vos documents
        par l'équipe Keyli.
      </Texte>

      <EtatForfait etat={f} />

      {possible ? (
        <>
          {champ('titre', "Titre de l'annonce", { placeholder: 'Ex. : Appartement 3 pièces à Cocody Angré' })}

          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <View style={styles.groupe}>
                <Choix
                  libelle="Type de bien"
                  options={TYPES}
                  valeur={field.value as TypeBien}
                  onChange={field.onChange}
                />
                {e.type?.message ? <Text style={styles.erreur}>{e.type.message}</Text> : null}
              </View>
            )}
          />

          <Controller
            control={control}
            name="statut"
            render={({ field }) => (
              <Choix libelle="Transaction" options={TRANSACTIONS} valeur={field.value} onChange={field.onChange} />
            )}
          />

          {statut === 'a_louer' ? (
            <Carte style={{ gap: espaces.m }}>
              <CaseACocher coche={sejour} onChange={(v) => !hotelier && setValue('sejourCourt', v)}>
                <Text style={styles.texteCase}>Séjour court — réservation à la nuit</Text>
                <Text style={styles.aide}>
                  {hotelier
                    ? 'Toujours activé pour un hôtel ou une auberge. Ajoutez ensuite vos types de chambres sur le site, dans « Mes annonces ».'
                    : 'Les voyageurs choisissent leurs dates et vous envoient une demande à accepter.'}
                </Text>
              </CaseACocher>
              {sejour ? champ('nuitsMin', 'Nuits minimum', { ...nombre, placeholder: '1' }) : null}
              {sejour && !hotelier ? champ('voyageursMax', 'Voyageurs maximum', { ...nombre, placeholder: '4' }) : null}
            </Carte>
          ) : null}

          {champ(
            'prix',
            statut === 'a_vendre'
              ? 'Prix de vente (XOF)'
              : hotelier
                ? 'Prix de la chambre la moins chère, par nuit (XOF)'
                : sejour
                  ? 'Prix par nuit (XOF)'
                  : 'Loyer mensuel (XOF)',
            nombre,
          )}

          {champ('ville', 'Ville')}
          <Controller
            control={control}
            name="quartierId"
            render={({ field }) => (
              <Selecteur
                libelle="Quartier"
                tous="Non précisé"
                options={(quartiers.data ?? []).map((q) => ({ valeur: q.id, libelle: `${q.commune} — ${q.nom}` }))}
                valeur={field.value || undefined}
                onChange={(v) => field.onChange(v ?? '')}
              />
            )}
          />

          <SelecteurPosition
            valeur={latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null}
            onChange={(p) => {
              setValue('latitude', p.latitude, { shouldValidate: true })
              setValue('longitude', p.longitude, { shouldValidate: true })
            }}
            erreur={e.latitude?.message}
          />

          <GrillePhotos
            photos={photos}
            onChange={(liste) => {
              setErreurPhotos(undefined)
              setPhotos(liste)
            }}
            occupe={envoiEnCours}
            progression={progression}
            erreur={erreurPhotos}
          />

          {champ('surface', 'Surface (m²)', { keyboardType: 'decimal-pad' })}
          {champ('pieces', 'Pièces', nombre)}
          {champ('sallesDeBain', 'Salles de bain', nombre)}

          <Controller
            control={control}
            name="meuble"
            render={({ field }) => (
              <CaseACocher coche={field.value} onChange={field.onChange}>
                <Text style={styles.texteCase}>Bien meublé</Text>
              </CaseACocher>
            )}
          />

          {champ('description', 'Description', {
            multiline: true,
            numberOfLines: 5,
            textAlignVertical: 'top',
            style: { minHeight: 120 },
            placeholder: 'État, environnement, conditions (caution, avance)…',
          })}

          {avantages.data ? (
            <Controller
              control={control}
              name="avantages"
              render={({ field }) => (
                <>
                  {CATEGORIES.map((c) => (
                    <ChoixMultiple
                      key={c.code}
                      libelle={c.titre}
                      options={avantages.data
                        .filter((a) => a.categorie === c.code)
                        .map((a) => ({ valeur: a.id, libelle: a.libelle }))}
                      selection={field.value}
                      onChange={field.onChange}
                    />
                  ))}
                </>
              )}
            />
          ) : null}

          {depassement && f.prix_depassement !== null ? (
            <Controller
              control={control}
              name="accepteDepassement"
              render={({ field }) => (
                <CaseACocher coche={field.value} onChange={field.onChange}>
                  <Text style={styles.texteCase}>
                    J'accepte que cette annonce, au-delà de mon forfait, me soit facturée{' '}
                    <Text style={styles.gras}>{formatXof(Number(f.prix_depassement))} par mois</Text> avec mon
                    prochain paiement, tant que je dépasse le seuil.
                  </Text>
                </CaseACocher>
              )}
            />
          ) : null}

          {publication.isError ? <Message>{messageErreur(publication.error)}</Message> : null}

          <Bouton
            libelle={
              progression !== null && !publication.isPending
                ? 'Envoi des photos…'
                : publication.isPending
                  ? 'Publication…'
                  : "Publier l'annonce"
            }
            onPress={publier}
            chargement={envoiEnCours}
            desactive={depassement && !accord}
          />
        </>
      ) : null}
    </Ecran>
  )
}

// Compteur du cycle et raison d'un éventuel blocage — valeurs calculées par
// la base (etat_publication_keyli), jamais recalculées ici (comme le web)
function EtatForfait({
  etat,
}: {
  etat: { statut: string; seuil_max: number | null; publications_cycle: number; prix_depassement: number | null }
}) {
  const allerAuForfait = (
    <Bouton
      libelle="Choisir un forfait sur le site"
      variante="secondaire"
      onPress={() => void Linking.openURL(plateforme.urlApp('/abonnement'))}
    />
  )
  switch (etat.statut) {
    case 'sans_abonnement':
      return (
        <>
          <Message>Un abonnement actif est nécessaire pour publier une annonce.</Message>
          {allerAuForfait}
        </>
      )
    case 'registre_requis':
      return (
        <Message>
          Votre registre de commerce doit être approuvé par l'équipe Keyli avant votre première publication.
        </Message>
      )
    case 'bloquee':
      return (
        <>
          <Message>
            Votre forfait est limité à {etat.seuil_max} annonces ce mois-ci et vous les avez toutes utilisées.
          </Message>
          {allerAuForfait}
        </>
      )
  }
  return (
    <Carte style={{ gap: espaces.xs }}>
      <Text style={styles.gras}>
        {etat.seuil_max
          ? `${etat.publications_cycle} / ${etat.seuil_max} annonces ce mois-ci`
          : `${etat.publications_cycle} annonces ce mois-ci`}
      </Text>
      {etat.statut === 'depassement' && etat.prix_depassement !== null ? (
        <Text style={styles.aide}>
          Cette annonce dépasse votre forfait : {formatXof(Number(etat.prix_depassement))} par mois, ajoutés à votre
          prochain paiement tant que vous dépassez le seuil. Votre accord vous sera demandé avant la publication.
        </Text>
      ) : null}
      {etat.statut === 'couverte_negociee' ? (
        <Text style={styles.aide}>Au-delà du seuil : couvert par votre formule personnalisée.</Text>
      ) : null}
    </Carte>
  )
}

const styles = StyleSheet.create({
  groupe: { gap: espaces.xs },
  texteCase: { fontSize: 15, lineHeight: 21, color: couleurs.texte },
  aide: { fontSize: 13, lineHeight: 18, color: couleurs.attenue },
  gras: { fontWeight: '700', color: couleurs.texte },
  erreur: { fontSize: 13, color: couleurs.erreurTexte },
})
