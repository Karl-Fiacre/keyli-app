// Filtres complets de la recherche — mêmes filtres que le web
// (src/components/annonce/FiltresRecherche.tsx) et même fonction de base.
// Sur téléphone, les choix se font dans un brouillon appliqué d'un coup par
// « Afficher les résultats » (une seule recherche, pas une par toucher).
import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { FiltresRecherche } from '@/partage/hooks/useRecherche'
import { useCommunes } from '@/partage/hooks/useRecherche'
import { useAvantages, useQuartiers, type TypeBien } from '@/partage/hooks/useAnnonces'
import { LIBELLES_TYPE, TYPES_BIEN } from '@/partage/lib/validation'
import { nombreFiltresActifs } from '@/partage/lib/recherche'
import { formatJourCourt, nuitsEntre, pluriel } from '@/partage/lib/sejour'
import { Bouton, Champ, Choix, ChoixMultiple } from '@mobile/composants/base'
import { Selecteur } from '@mobile/composants/Selecteur'
import { CalendrierSejour } from '@mobile/composants/CalendrierSejour'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'

type Transaction = 'tout' | 'a_louer' | 'a_vendre' | 'sejour'
const TRANSACTIONS: readonly { valeur: Transaction; libelle: string }[] = [
  { valeur: 'tout', libelle: 'Tout' },
  { valeur: 'a_louer', libelle: 'À louer' },
  { valeur: 'a_vendre', libelle: 'À vendre' },
  { valeur: 'sejour', libelle: 'Séjour court' },
]
const TYPES = [
  { valeur: '', libelle: 'Tous' },
  ...TYPES_BIEN.map((t) => ({ valeur: t as string, libelle: LIBELLES_TYPE[t] })),
]
const PIECES = [
  { valeur: '', libelle: 'Indifférent' },
  ...[1, 2, 3, 4, 5].map((n) => ({ valeur: String(n), libelle: n === 5 ? '5 et +' : String(n) })),
]
const MEUBLE = [
  { valeur: '', libelle: 'Indifférent' },
  { valeur: 'oui', libelle: 'Meublé' },
  { valeur: 'non', libelle: 'Non meublé' },
] as const
const VOYAGEURS = [
  { valeur: '', libelle: 'Indifférent' },
  ...Array.from({ length: 10 }, (_, i) => ({ valeur: String(i + 1), libelle: i === 9 ? '10 et +' : String(i + 1) })),
]
const CATEGORIES = [
  { code: 'equipement', titre: 'Équipements' },
  { code: 'proximite', titre: 'À proximité' },
] as const

const prixSaisi = (v: string) => {
  const n = Number(v.replace(/\s/g, ''))
  return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : undefined
}

export function PanneauFiltres({
  visible,
  filtres,
  onAppliquer,
  onFermer,
}: {
  visible: boolean
  filtres: FiltresRecherche
  onAppliquer: (f: FiltresRecherche) => void
  onFermer: () => void
}) {
  const communes = useCommunes()
  const quartiers = useQuartiers()
  const avantages = useAvantages()
  const [f, setF] = useState(filtres)
  const [prixMin, setPrixMin] = useState('')
  const [prixMax, setPrixMax] = useState('')

  // Le brouillon repart des filtres en cours à chaque ouverture
  useEffect(() => {
    if (!visible) return
    setF(filtres)
    setPrixMin(filtres.prixMin !== undefined ? String(filtres.prixMin) : '')
    setPrixMax(filtres.prixMax !== undefined ? String(filtres.prixMax) : '')
  }, [visible, filtres])

  const maj = (partiel: Partial<FiltresRecherche>) => setF((v) => ({ ...v, ...partiel }))
  const transaction: Transaction = f.sejour ? 'sejour' : (f.statut ?? 'tout')
  const nomCommune = communes.data?.find((c) => c.id === f.commune)?.nom
  const quartiersProposes = (quartiers.data ?? [])
    .filter((q) => !nomCommune || q.commune === nomCommune)
    .map((q) => ({ valeur: q.id, libelle: nomCommune ? q.nom : `${q.commune} — ${q.nom}` }))

  // Une arrivée seule (départ pas encore choisi) ne filtre pas, comme sur le web
  const datesCompletes = !!f.arrivee && !!f.depart
  const brouillon: FiltresRecherche = {
    ...f,
    arrivee: datesCompletes ? f.arrivee : undefined,
    depart: datesCompletes ? f.depart : undefined,
    prixMin: prixSaisi(prixMin),
    prixMax: prixSaisi(prixMax),
    page: 1,
  }
  const actifs = nombreFiltresActifs(brouillon)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onFermer}>
      <SafeAreaView style={styles.fenetre} edges={['top', 'bottom']}>
        <View style={styles.entete}>
          <Text style={styles.titre} accessibilityRole="header">
            Filtres
          </Text>
          <Pressable onPress={onFermer} accessibilityRole="button" accessibilityLabel="Fermer les filtres" hitSlop={8}>
            <Ionicons name="close" size={26} color={couleurs.texte} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
          <Choix
            libelle="Transaction"
            options={TRANSACTIONS}
            valeur={transaction}
            onChange={(t) =>
              maj(
                t === 'sejour'
                  ? { statut: 'a_louer', sejour: true }
                  : {
                      statut: t === 'tout' ? undefined : t,
                      sejour: undefined,
                      arrivee: undefined,
                      depart: undefined,
                      voyageurs: undefined,
                    },
              )
            }
          />

          {f.sejour ? (
            <View style={styles.bloc}>
              <Text style={styles.sousTitre}>
                {f.arrivee && f.depart
                  ? `${formatJourCourt(f.arrivee)} → ${formatJourCourt(f.depart)} · ${pluriel(nuitsEntre(f.arrivee, f.depart), 'nuit')}`
                  : 'Dates du séjour'}
              </Text>
              <CalendrierSejour
                arrivee={f.arrivee ?? null}
                depart={f.depart ?? null}
                onChange={(a, d) => maj({ arrivee: a ?? undefined, depart: d ?? undefined })}
              />
              <Choix
                libelle="Voyageurs"
                options={VOYAGEURS}
                valeur={f.voyageurs ? String(f.voyageurs) : ''}
                onChange={(v) => maj({ voyageurs: v ? Number(v) : undefined })}
              />
            </View>
          ) : null}

          <Choix
            libelle="Type de bien"
            options={TYPES}
            valeur={f.type ?? ''}
            onChange={(v) => maj({ type: (v || undefined) as TypeBien | undefined })}
          />

          <View style={styles.ligne}>
            <Selecteur
              libelle="Commune"
              tous="Toutes"
              options={(communes.data ?? []).map((c) => ({ valeur: c.id, libelle: c.nom }))}
              valeur={f.commune}
              onChange={(v) => maj({ commune: v, quartier: undefined })}
            />
            <Selecteur
              libelle="Quartier"
              tous="Tous"
              options={quartiersProposes}
              valeur={f.quartier}
              onChange={(v) => maj({ quartier: v })}
            />
          </View>

          <View style={styles.ligne}>
            <View style={styles.moitie}>
              <Champ
                libelle="Prix minimum"
                value={prixMin}
                onChangeText={setPrixMin}
                keyboardType="number-pad"
                placeholder="XOF"
              />
            </View>
            <View style={styles.moitie}>
              <Champ
                libelle="Prix maximum"
                value={prixMax}
                onChangeText={setPrixMax}
                keyboardType="number-pad"
                placeholder="XOF"
              />
            </View>
          </View>

          <Choix
            libelle="Pièces (minimum)"
            options={PIECES}
            valeur={f.piecesMin !== undefined ? String(f.piecesMin) : ''}
            onChange={(v) => maj({ piecesMin: v ? Number(v) : undefined })}
          />
          <Choix
            libelle="Meublé"
            options={MEUBLE}
            valeur={f.meuble === undefined ? '' : f.meuble ? 'oui' : 'non'}
            onChange={(v) => maj({ meuble: v === '' ? undefined : v === 'oui' })}
          />

          {CATEGORIES.map((c) => {
            const options = (avantages.data ?? [])
              .filter((a) => a.categorie === c.code)
              .map((a) => ({ valeur: a.id, libelle: a.libelle }))
            return options.length > 0 ? (
              <ChoixMultiple
                key={c.code}
                libelle={c.titre}
                options={options}
                selection={f.avantages}
                onChange={(ids) => maj({ avantages: ids })}
              />
            ) : null
          })}
        </ScrollView>

        <View style={styles.pied}>
          <View style={styles.moitie}>
            <Bouton
              libelle="Effacer"
              variante="secondaire"
              onPress={() => {
                setF({ avantages: [], tri: f.tri, page: 1 })
                setPrixMin('')
                setPrixMax('')
              }}
            />
          </View>
          <View style={styles.moitie}>
            <Bouton
              libelle={actifs > 0 ? `Afficher (${actifs})` : 'Afficher'}
              onPress={() => onAppliquer(brouillon)}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fenetre: { flex: 1, backgroundColor: couleurs.fond },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaces.xl,
    paddingVertical: espaces.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: couleurs.bordure,
  },
  titre: { fontSize: 20, fontWeight: '700', color: couleurs.texte },
  contenu: { padding: espaces.xl, gap: espaces.xl },
  bloc: {
    gap: espaces.m,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.carte,
    padding: espaces.m,
  },
  sousTitre: { fontSize: 15, fontWeight: '700', color: couleurs.texte },
  ligne: { flexDirection: 'row', gap: espaces.m },
  moitie: { flex: 1 },
  pied: {
    flexDirection: 'row',
    gap: espaces.m,
    paddingHorizontal: espaces.xl,
    paddingVertical: espaces.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: couleurs.bordure,
  },
})
