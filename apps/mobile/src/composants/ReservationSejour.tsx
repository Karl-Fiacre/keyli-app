// Carte de réservation de la fiche (séjours courts, Sprint 19) — même
// parcours que le web (src/components/reservation/ReservationSejour.tsx) :
// type de chambre pour un hôtel ou une auberge, dates sur calendrier avec
// nuits complètes, voyageurs, chambres, devis calculé par la base, puis
// demande envoyée à l'hôte. Aucun calcul de prix ici : tout vient de
// devis_sejour_keyli (docs/MODULES/reservations.md).
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSession } from '@/partage/hooks/useSession'
import {
  useDemanderReservation,
  useDevisSejour,
  useNuitsCompletes,
  useTypesChambres,
} from '@/partage/hooks/useReservations'
import { messageErreur } from '@/partage/lib/erreurs'
import { formatXof } from '@/partage/lib/format'
import { ajouterJours, aujourdhuiIso, formatJourCourt, isoValide, pluriel, premierDuMois } from '@/partage/lib/sejour'
import { Bouton, Carte, Champ, Message, Texte } from '@mobile/composants/base'
import { CalendrierSejour } from '@mobile/composants/CalendrierSejour'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'
import type { ParamsRacine } from '@mobile/navigation/types'

interface Props {
  propertyId: string
  hotelier: boolean
  prixNuit: number
  nuitsMin: number
  voyageursMax: number | null
  estProprietaire: boolean
  // Dates venues de la recherche (facultatives)
  arriveeInitiale?: string
  departInitial?: string
  voyageursInitiaux?: number
}

export function ReservationSejour({
  propertyId,
  hotelier,
  prixNuit,
  nuitsMin,
  voyageursMax,
  estProprietaire,
  arriveeInitiale,
  departInitial,
  voyageursInitiaux,
}: Props) {
  const { session } = useSession()
  const navigation = useNavigation<NativeStackNavigationProp<ParamsRacine>>()
  const [arrivee, setArrivee] = useState<string | null>(
    isoValide(arriveeInitiale) && arriveeInitiale >= aujourdhuiIso() ? arriveeInitiale : null,
  )
  const [depart, setDepart] = useState<string | null>(
    arrivee && isoValide(departInitial) && departInitial > arrivee ? departInitial : null,
  )
  const [voyageurs, setVoyageurs] = useState(Math.max(1, voyageursInitiaux ?? 1))
  const [chambres, setChambres] = useState(1)
  const [chambreId, setChambreId] = useState<string | null>(null)
  const [calendrierOuvert, setCalendrierOuvert] = useState(!arrivee)
  const [message, setMessage] = useState('')
  const [moisVu, setMoisVu] = useState(() => premierDuMois(arrivee ?? aujourdhuiIso()))

  const typesChambres = useTypesChambres(hotelier ? propertyId : undefined)
  const chambre = typesChambres.data?.find((c) => c.id === chambreId) ?? null
  // Premier type de chambre choisi d'office
  useEffect(() => {
    if (hotelier && !chambreId && typesChambres.data?.length) setChambreId(typesChambres.data[0].id)
  }, [hotelier, chambreId, typesChambres.data])

  const pret = !hotelier || !!chambreId
  const completes = useNuitsCompletes(propertyId, chambreId, moisVu, ajouterJours(moisVu, 62), pret)
  const parametres = { propertyId, chambreId, arrivee, depart, voyageurs, chambres }
  const devis = useDevisSejour(parametres, pret)
  const demande = useDemanderReservation()

  const capaciteVoyageurs = hotelier ? (chambre ? chambre.voyageurs_max * chambres : 1) : (voyageursMax ?? 50)
  const prixAffiche = hotelier ? Number(chambre?.prix_nuit ?? prixNuit) : prixNuit
  const d = devis.data
  const reservable = !!arrivee && !!depart && !!d && !d.motif

  if (hotelier && typesChambres.isSuccess && typesChambres.data.length === 0) {
    return (
      <Cadre prix={prixNuit} aPartirDe>
        <Texte attenue>
          Les chambres de cet établissement ne sont pas encore ouvertes à la réservation. Écrivez à l'hôte ci-dessous.
        </Texte>
      </Cadre>
    )
  }

  if (demande.isSuccess) {
    return (
      <Cadre prix={prixAffiche}>
        <Message type="succes">
          Demande envoyée ! L'hôte vous répond dans les meilleurs délais. Les nuits sont bloquées pour vous dès qu'il
          accepte.
        </Message>
        <Bouton libelle="Voir mes réservations" onPress={() => navigation.navigate('Reservations')} />
      </Cadre>
    )
  }

  return (
    <Cadre prix={prixAffiche} aPartirDe={hotelier && !chambre}>
      {hotelier ? (
        <View style={{ gap: espaces.s }}>
          <Text style={styles.libelle}>Type de chambre</Text>
          {typesChambres.data?.map((c) => {
            const actif = chambreId === c.id
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setChambreId(c.id)
                  setChambres(1)
                  setVoyageurs((v) => Math.min(v, c.voyageurs_max))
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: actif }}
                style={[styles.chambre, actif && styles.chambreActive]}
              >
                <View style={styles.ligne}>
                  <Text style={styles.nomChambre}>{c.nom}</Text>
                  <Text style={styles.nomChambre}>{formatXof(Number(c.prix_nuit))}</Text>
                </View>
                <Text style={styles.detail}>{pluriel(c.voyageurs_max, 'voyageur')} max · par nuit</Text>
                {c.description ? <Text style={styles.detail}>{c.description}</Text> : null}
              </Pressable>
            )
          })}
        </View>
      ) : null}

      {/* Dates */}
      <View style={{ gap: espaces.s }}>
        <Pressable
          onPress={() => setCalendrierOuvert((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: calendrierOuvert }}
          accessibilityLabel={`Dates du séjour : ${arrivee ? formatJourCourt(arrivee) : 'arrivée à choisir'}, ${depart ? formatJourCourt(depart) : 'départ à choisir'}`}
          style={styles.dates}
        >
          <View style={[styles.date, styles.dateGauche]}>
            <Text style={styles.petitTitre}>ARRIVÉE</Text>
            <Text style={styles.valeurDate}>{arrivee ? formatJourCourt(arrivee) : 'Ajouter'}</Text>
          </View>
          <View style={styles.date}>
            <Text style={styles.petitTitre}>DÉPART</Text>
            <Text style={styles.valeurDate}>{depart ? formatJourCourt(depart) : 'Ajouter'}</Text>
          </View>
        </Pressable>
        {calendrierOuvert ? (
          <View style={styles.calendrier}>
            <CalendrierSejour
              arrivee={arrivee}
              depart={depart}
              completes={completes.data}
              onMoisChange={setMoisVu}
              onChange={(a, dep) => {
                setArrivee(a)
                setDepart(dep)
                if (a && dep) setCalendrierOuvert(false)
              }}
            />
          </View>
        ) : null}
        {nuitsMin > 1 ? <Text style={styles.detail}>Séjour de {pluriel(nuitsMin, 'nuit')} minimum</Text> : null}
      </View>

      <Compteur libelle="Voyageurs" valeur={voyageurs} min={1} max={capaciteVoyageurs} onChange={setVoyageurs} />
      {hotelier && chambre && chambre.quantite > 1 ? (
        <Compteur libelle="Chambres" valeur={chambres} min={1} max={chambre.quantite} onChange={setChambres} />
      ) : null}

      {/* Devis de la base */}
      {arrivee && depart && d ? (
        <View style={styles.devis} accessibilityLiveRegion="polite">
          {d.nuits && d.prix_nuit ? (
            <View style={styles.ligne}>
              <Text style={styles.detail}>
                {formatXof(Number(d.prix_nuit))} × {pluriel(d.nuits, 'nuit')}
                {chambres > 1 ? ` × ${chambres} chambres` : ''}
              </Text>
              {d.montant_total ? <Text style={styles.detail}>{formatXof(Number(d.montant_total))}</Text> : null}
            </View>
          ) : null}
          {d.motif ? (
            <Message>{d.motif}</Message>
          ) : (
            <View style={styles.ligne}>
              <Text style={styles.total}>Total</Text>
              <Text style={styles.total}>{formatXof(Number(d.montant_total))}</Text>
            </View>
          )}
        </View>
      ) : null}

      {estProprietaire ? (
        <Texte attenue>C'est votre annonce : les demandes arrivent dans Mes réservations.</Texte>
      ) : !session ? (
        <Bouton
          libelle="Se connecter pour réserver"
          onPress={() => navigation.navigate('Compte', { screen: 'Connexion' })}
        />
      ) : (
        <View style={{ gap: espaces.m }}>
          {reservable ? (
            <Champ
              libelle="Message à l'hôte (facultatif)"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              placeholder="Heure d'arrivée prévue, motif du séjour…"
              textAlignVertical="top"
              style={{ minHeight: 90, paddingTop: espaces.m }}
            />
          ) : null}
          {demande.isError ? <Message>{messageErreur(demande.error)}</Message> : null}
          <Bouton
            libelle={!arrivee || !depart ? 'Choisissez vos dates' : 'Demander à réserver'}
            chargement={demande.isPending}
            desactive={!reservable}
            onPress={() => demande.mutate({ ...parametres, message: message.trim() })}
          />
          <Text style={[styles.detail, { textAlign: 'center' }]}>
            Aucun paiement maintenant : vous réglez directement avec l'hôte après son accord.
          </Text>
        </View>
      )}
    </Cadre>
  )
}

function Cadre({ prix, aPartirDe, children }: { prix: number; aPartirDe?: boolean; children: React.ReactNode }) {
  return (
    <Carte style={{ gap: espaces.l }}>
      <Text style={styles.detail}>
        {aPartirDe ? 'À partir de ' : ''}
        <Text style={styles.prix}>{formatXof(prix)}</Text> / nuit
      </Text>
      {children}
    </Carte>
  )
}

function Compteur({
  libelle,
  valeur,
  min,
  max,
  onChange,
}: {
  libelle: string
  valeur: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const bouton = (sens: -1 | 1) => {
    const inactif = sens < 0 ? valeur <= min : valeur >= max
    return (
      <Pressable
        onPress={() => onChange(valeur + sens)}
        disabled={inactif}
        accessibilityRole="button"
        accessibilityLabel={`${sens < 0 ? 'Moins' : 'Plus'} de ${libelle.toLowerCase()}`}
        accessibilityState={{ disabled: inactif }}
        hitSlop={6}
        style={[styles.rond, inactif && { opacity: 0.35 }]}
      >
        <Ionicons name={sens < 0 ? 'remove' : 'add'} size={18} color={couleurs.texte} />
      </Pressable>
    )
  }
  return (
    <View style={styles.ligne}>
      <Text style={styles.libelle}>{libelle}</Text>
      <View style={styles.compteur}>
        {bouton(-1)}
        <Text style={styles.valeurCompteur} accessibilityLiveRegion="polite">
          {valeur}
        </Text>
        {bouton(1)}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaces.s },
  libelle: { fontSize: 15, fontWeight: '600', color: couleurs.texte },
  detail: { fontSize: 14, color: couleurs.attenue },
  prix: { fontSize: 22, fontWeight: '700', color: couleurs.texte },
  chambre: {
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.champ,
    padding: espaces.m,
    gap: 2,
  },
  chambreActive: { borderColor: couleurs.primaire, backgroundColor: couleurs.secondaire },
  nomChambre: { fontSize: 15, fontWeight: '700', color: couleurs.texte },
  dates: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.champ,
    overflow: 'hidden',
  },
  date: { flex: 1, padding: espaces.m, gap: 2 },
  dateGauche: { borderRightWidth: 1, borderRightColor: couleurs.bordure },
  petitTitre: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: couleurs.attenue },
  valeurDate: { fontSize: 15, fontWeight: '600', color: couleurs.texte },
  calendrier: { borderWidth: 1, borderColor: couleurs.bordure, borderRadius: rayons.champ, padding: espaces.m },
  devis: { gap: espaces.s, borderTopWidth: 1, borderTopColor: couleurs.bordure, paddingTop: espaces.m },
  total: { fontSize: 17, fontWeight: '700', color: couleurs.texte },
  compteur: { flexDirection: 'row', alignItems: 'center', gap: espaces.m },
  rond: {
    width: 34,
    height: 34,
    borderRadius: rayons.pilule,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valeurCompteur: { minWidth: 24, textAlign: 'center', fontSize: 16, fontWeight: '700', color: couleurs.texte },
})
