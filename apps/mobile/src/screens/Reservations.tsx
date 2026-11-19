// Réservations (Sprint 19) — même écran que /reservations sur le web :
// « Mes séjours » (tout compte) et « Demandes reçues » (propriétaires,
// agences). À venir d'abord, puis l'historique. Chaque action est revérifiée
// par la base (repondre_reservation_keyli, annuler_reservation_keyli).
import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useProfil } from '@/partage/hooks/useProfil'
import {
  useAnnulerReservation,
  useNomsVoyageurs,
  useRepondreReservation,
  useReservations,
  type Reservation,
} from '@/partage/hooks/useReservations'
import { messageErreur } from '@/partage/lib/erreurs'
import { formatXof } from '@/partage/lib/format'
import { urlPhoto } from '@/partage/lib/photos'
import { aujourdhuiIso, formatJourCourt, pluriel } from '@/partage/lib/sejour'
import { Bouton, Carte, Chargement, Champ, Choix, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

type Sens = 'voyageur' | 'hote'
type Props = NativeStackScreenProps<ParamsRacine, 'Reservations'>

const ONGLETS = [
  { valeur: 'voyageur' as const, libelle: 'Mes séjours' },
  { valeur: 'hote' as const, libelle: 'Demandes reçues' },
]

export default function Reservations({ navigation }: Props) {
  const role = useProfil().data?.role_keyli
  const hote = role === 'owner' || role === 'agency'
  const [onglet, setOnglet] = useState<Sens>('voyageur')
  const sens: Sens = hote ? onglet : 'voyageur'
  const recues = useReservations('hote')
  const enAttente = (recues.data ?? []).filter((r) => r.statut === 'demandee' && r.date_arrivee >= aujourdhuiIso())

  return (
    <Ecran>
      <Titre>Réservations</Titre>
      <Texte attenue>Séjours courts : demandes, réponses des hôtes et nuits confirmées.</Texte>
      {hote ? (
        <Choix
          libelle={enAttente.length > 0 ? `Demandes en attente : ${enAttente.length}` : 'Afficher'}
          options={ONGLETS}
          valeur={onglet}
          onChange={setOnglet}
        />
      ) : null}
      <Liste sens={sens} navigation={navigation} />
    </Ecran>
  )
}

function Liste({ sens, navigation }: { sens: Sens; navigation: Props['navigation'] }) {
  const reservations = useReservations(sens)
  const liste = reservations.data ?? []
  const noms = useNomsVoyageurs(sens === 'hote' ? [...new Set(liste.map((r) => r.voyageur_id))] : [])
  const aujourdhui = aujourdhuiIso()
  const active = (r: Reservation) =>
    r.date_depart >= aujourdhui && (r.statut === 'demandee' || r.statut === 'acceptee')
  const aVenir = liste.filter(active)
  const historique = liste.filter((r) => !active(r)).reverse()

  if (reservations.isPending) return <Chargement />
  if (reservations.isError) return <Message>{messageErreur(reservations.error)}</Message>

  if (liste.length === 0) {
    return (
      <Carte style={{ gap: espaces.m, alignItems: 'center' }}>
        <Ionicons name="calendar-outline" size={36} color={couleurs.attenue} />
        <Text style={styles.titreVide}>
          {sens === 'voyageur' ? 'Aucune réservation pour le moment' : 'Aucune demande reçue pour le moment'}
        </Text>
        <Texte attenue>
          {sens === 'voyageur'
            ? 'Hôtels, auberges, résidences meublées : choisissez vos dates dans la recherche (« Séjour court ») et réservez en quelques gestes.'
            : 'Les demandes de vos séjours courts arriveront ici. Pour un hôtel, ajoutez vos chambres sur le site, dans « Mes annonces ».'}
        </Texte>
        {sens === 'voyageur' ? (
          <Bouton
            libelle="Trouver un séjour"
            onPress={() =>
              navigation.navigate('Onglets', {
                screen: 'Recherche',
                params: { filtres: { avantages: [], tri: 'pertinence', page: 1, statut: 'a_louer', sejour: true } },
              })
            }
          />
        ) : null}
      </Carte>
    )
  }

  const carte = (r: Reservation) => (
    <CarteReservation
      key={r.id}
      reservation={r}
      sens={sens}
      nomVoyageur={noms.data?.get(r.voyageur_id)}
      navigation={navigation}
    />
  )
  return (
    <View style={{ gap: espaces.xl }}>
      {aVenir.length > 0 ? (
        <View style={{ gap: espaces.m }}>
          <Text style={styles.sousTitre}>À venir</Text>
          {aVenir.map(carte)}
        </View>
      ) : null}
      {historique.length > 0 ? (
        <View style={{ gap: espaces.m }}>
          <Text style={styles.sousTitre}>Historique</Text>
          {historique.map(carte)}
        </View>
      ) : null}
    </View>
  )
}

// Libellé et couleurs de statut (vert = accepté, orange = en attente,
// rouge = refusé, gris = annulé ou expiré — comme le web)
function etiquette(r: Reservation): { texte: string; fond: string; couleur: string } {
  if (r.statut === 'demandee' && r.date_arrivee < aujourdhuiIso())
    return { texte: 'Expirée', fond: couleurs.secondaire, couleur: couleurs.attenue }
  switch (r.statut) {
    case 'demandee':
      return { texte: "En attente de l'hôte", fond: couleurs.secondaire, couleur: couleurs.attenteTexte }
    case 'acceptee':
      return { texte: 'Acceptée', fond: couleurs.succesFond, couleur: couleurs.succesTexte }
    case 'refusee':
      return { texte: 'Refusée', fond: couleurs.erreurFond, couleur: couleurs.erreurTexte }
    default:
      return { texte: 'Annulée', fond: couleurs.secondaire, couleur: couleurs.attenue }
  }
}

function CarteReservation({
  reservation: r,
  sens,
  nomVoyageur,
  navigation,
}: {
  reservation: Reservation
  sens: Sens
  nomVoyageur?: string
  navigation: Props['navigation']
}) {
  const repondre = useRepondreReservation()
  const annuler = useAnnulerReservation()
  const [saisie, setSaisie] = useState<null | 'refus' | 'annulation'>(null)
  const [motif, setMotif] = useState('')
  const e = etiquette(r)
  const avenir = r.date_arrivee >= aujourdhuiIso()
  const annonce = r.properties_keyli
  const erreur = repondre.error ?? annuler.error
  const enCours = repondre.isPending || annuler.isPending
  // L'hôte doit motiver l'annulation d'une réservation acceptée
  const motifManquant = saisie === 'annulation' && sens === 'hote' && !motif.trim()

  const confirmer = () => {
    const fin = { onSuccess: () => setSaisie(null) }
    if (saisie === 'refus') repondre.mutate({ id: r.id, accepter: false, motif }, fin)
    if (saisie === 'annulation') annuler.mutate({ id: r.id, motif }, fin)
  }
  const ecrire = () =>
    navigation.navigate('Conversation', {
      propertyId: r.property_id,
      interlocuteur: sens === 'voyageur' ? r.owner_id : r.voyageur_id,
      nom: sens === 'hote' ? nomVoyageur : undefined,
      titre: annonce?.title ?? undefined,
    })

  return (
    <Carte style={{ gap: espaces.m, padding: 0, overflow: 'hidden' }}>
      <Pressable
        onPress={() => navigation.navigate('FicheAnnonce', { id: r.property_id, source: 'lien_direct' })}
        accessibilityRole="link"
        accessibilityLabel={`Voir l'annonce ${annonce?.title ?? ''}`}
        style={styles.entete}
      >
        {annonce?.main_image_url ? (
          <Image source={{ uri: urlPhoto(annonce.main_image_url, 240, 180) }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.sansPhoto]}>
            <Ionicons name="home-outline" size={24} color={couleurs.attenue} />
          </View>
        )}
        <View style={{ flex: 1, gap: espaces.xs }}>
          <Text style={styles.titreAnnonce} numberOfLines={2}>
            {annonce?.title ?? 'Annonce retirée'}
          </Text>
          {sens === 'hote' && nomVoyageur ? <Text style={styles.detail}>Demande de {nomVoyageur}</Text> : null}
          <Text style={[styles.statut, { backgroundColor: e.fond, color: e.couleur }]}>{e.texte}</Text>
        </View>
      </Pressable>

      <View style={styles.corps}>
        <Text style={styles.ligneInfo}>
          {formatJourCourt(r.date_arrivee)} → {formatJourCourt(r.date_depart)} · {pluriel(r.nuits ?? 0, 'nuit')}
        </Text>
        <Text style={styles.ligneInfo}>
          {pluriel(r.voyageurs, 'voyageur')}
          {r.types_chambres_keyli ? ` · ${r.nb_chambres} × ${r.types_chambres_keyli.nom}` : ''}
        </Text>
        <Text style={styles.ligneInfo}>
          Total <Text style={{ fontWeight: '700' }}>{formatXof(Number(r.montant_total))}</Text>
          <Text style={styles.detail}> · à régler directement avec l'hôte</Text>
        </Text>
        {r.message && sens === 'hote' ? <Text style={styles.citation}>« {r.message} »</Text> : null}
        {r.motif && (r.statut === 'refusee' || r.statut === 'annulee') ? (
          <Text style={styles.detail}>Motif : {r.motif}</Text>
        ) : null}

        {erreur ? <Message>{messageErreur(erreur)}</Message> : null}

        {saisie ? (
          <View style={{ gap: espaces.s }}>
            <Champ
              libelle={
                saisie === 'refus'
                  ? 'Motif du refus (facultatif)'
                  : sens === 'hote'
                    ? "Motif de l'annulation (obligatoire)"
                    : "Motif de l'annulation (facultatif)"
              }
              value={motif}
              onChangeText={setMotif}
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={{ minHeight: 70, paddingTop: espaces.m }}
            />
            <Bouton
              libelle={saisie === 'refus' ? 'Refuser la demande' : "Confirmer l'annulation"}
              chargement={enCours}
              desactive={motifManquant}
              onPress={confirmer}
            />
            <Bouton libelle="Retour" variante="lien" onPress={() => setSaisie(null)} />
          </View>
        ) : (
          <View style={{ gap: espaces.s }}>
            {sens === 'hote' && r.statut === 'demandee' && avenir ? (
              <>
                <Bouton
                  libelle="Accepter"
                  chargement={repondre.isPending}
                  desactive={enCours}
                  onPress={() => repondre.mutate({ id: r.id, accepter: true })}
                />
                <Bouton libelle="Refuser" variante="secondaire" desactive={enCours} onPress={() => setSaisie('refus')} />
              </>
            ) : null}
            {avenir &&
            ((sens === 'voyageur' && (r.statut === 'demandee' || r.statut === 'acceptee')) ||
              (sens === 'hote' && r.statut === 'acceptee')) ? (
              <Bouton
                libelle={r.statut === 'demandee' ? 'Retirer ma demande' : 'Annuler'}
                variante="secondaire"
                desactive={enCours}
                onPress={() => setSaisie('annulation')}
              />
            ) : null}
            <Bouton
              libelle={sens === 'voyageur' ? "Écrire à l'hôte" : 'Écrire au voyageur'}
              variante="lien"
              onPress={ecrire}
            />
          </View>
        )}
      </View>
    </Carte>
  )
}

const styles = StyleSheet.create({
  titreVide: { fontSize: 16, fontWeight: '700', color: couleurs.texte, textAlign: 'center' },
  sousTitre: { fontSize: 17, fontWeight: '700', color: couleurs.texte },
  entete: { flexDirection: 'row', gap: espaces.m, padding: espaces.m, paddingBottom: 0 },
  photo: { width: 96, height: 72, borderRadius: rayons.champ, backgroundColor: couleurs.secondaire },
  sansPhoto: { alignItems: 'center', justifyContent: 'center' },
  titreAnnonce: { fontSize: 15, fontWeight: '700', color: couleurs.texte },
  statut: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: espaces.s,
    paddingVertical: 2,
    borderRadius: rayons.pilule,
    overflow: 'hidden',
  },
  corps: { paddingHorizontal: espaces.m, paddingBottom: espaces.m, gap: espaces.s },
  ligneInfo: { fontSize: 14, color: couleurs.texte },
  detail: { fontSize: 13, color: couleurs.attenue },
  citation: {
    fontSize: 14,
    fontStyle: 'italic',
    color: couleurs.texte,
    backgroundColor: couleurs.secondaire,
    padding: espaces.s,
    borderRadius: rayons.champ,
    overflow: 'hidden',
  },
})
