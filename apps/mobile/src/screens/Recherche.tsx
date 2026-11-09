// Recherche — filtres complets, tri, liste ou carte, alerte (Sprint 14).
// Même fonction de base que le web (rechercher_annonces_keyli) ; une alerte
// ouverte depuis l'écran « Mes alertes » arrive par les paramètres.
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { CompositeScreenProps } from '@react-navigation/native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { TAILLE_PAGE, useRecherche, type FiltresRecherche, type TriRecherche } from '@/partage/hooks/useRecherche'
import { LIBELLES_TRI, nombreFiltresActifs } from '@/partage/lib/recherche'
import { ListeAnnonces } from '@mobile/composants/ListeAnnonces'
import { CarteAnnonces } from '@mobile/composants/CarteAnnonces'
import { PanneauFiltres } from '@mobile/composants/PanneauFiltres'
import { BoutonAlerte } from '@mobile/composants/BoutonAlerte'
import { Bouton, Choix, Texte, Titre } from '@mobile/composants/base'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'
import type { ParamsOnglets, ParamsRacine } from '@mobile/navigation/types'

type Props = CompositeScreenProps<
  BottomTabScreenProps<ParamsOnglets, 'Recherche'>,
  NativeStackScreenProps<ParamsRacine>
>

const TRIS = (Object.keys(LIBELLES_TRI) as TriRecherche[]).map((t) => ({ valeur: t, libelle: LIBELLES_TRI[t] }))
const DEPART: FiltresRecherche = { avantages: [], tri: 'pertinence', page: 1 }

export default function Recherche({ navigation, route }: Props) {
  const [filtres, setFiltres] = useState<FiltresRecherche>(route.params?.filtres ?? DEPART)
  const [vue, setVue] = useState<'liste' | 'carte'>('liste')
  const [panneau, setPanneau] = useState(false)
  const recherche = useRecherche(filtres)
  const total = recherche.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / TAILLE_PAGE))
  const actifs = nombreFiltresActifs(filtres)

  // Filtres reçus d'une alerte : appliqués une fois, puis oubliés
  const imposes = route.params?.filtres
  useEffect(() => {
    if (!imposes) return
    setFiltres(imposes)
    navigation.setParams({ filtres: undefined })
  }, [imposes, navigation])

  const allerPage = (page: number) => setFiltres((f) => ({ ...f, page }))

  return (
    <SafeAreaView style={styles.ecran} edges={['top']}>
      <View style={styles.barre}>
        <Titre>Rechercher</Titre>
        <View style={styles.actions}>
          <Pressable
            onPress={() => setPanneau(true)}
            accessibilityRole="button"
            accessibilityLabel={actifs > 0 ? `Filtres, ${actifs} actifs` : 'Filtres'}
            style={[styles.puce, actifs > 0 && styles.puceActive]}
          >
            <Ionicons name="options-outline" size={18} color={actifs > 0 ? couleurs.surPrimaire : couleurs.texte} />
            <Text style={[styles.textePuce, actifs > 0 && { color: couleurs.surPrimaire }]}>
              Filtres{actifs > 0 ? ` (${actifs})` : ''}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setVue((v) => (v === 'liste' ? 'carte' : 'liste'))}
            accessibilityRole="button"
            accessibilityLabel={vue === 'liste' ? 'Afficher la carte' : 'Afficher la liste'}
            style={[styles.puce, styles.puceRonde]}
          >
            <Ionicons name={vue === 'liste' ? 'map-outline' : 'list-outline'} size={20} color={couleurs.texte} />
          </Pressable>
        </View>
      </View>

      {vue === 'carte' ? (
        <View style={styles.plein}>
          {/* La carte montre la page de résultats en cours (20 annonces) */}
          {pages > 1 ? (
            <View style={styles.pagesCarte}>
              <Pagination page={filtres.page} pages={pages} onChange={allerPage} />
            </View>
          ) : null}
          <CarteAnnonces
            annonces={recherche.data?.annonces ?? []}
            onOuvrir={(id) => navigation.navigate('FicheAnnonce', { id, source: 'map' })}
          />
        </View>
      ) : (
        <ListeAnnonces
          filtres={filtres}
          entete={
            <View style={styles.entete}>
              <Choix
                libelle="Trier par"
                options={TRIS}
                valeur={filtres.tri}
                onChange={(tri) => setFiltres((f) => ({ ...f, tri, page: 1 }))}
              />
              {recherche.data ? (
                <Texte attenue>
                  {total === 0 ? 'Aucune annonce' : `${total} annonce${total > 1 ? 's' : ''}`}
                  {actifs > 0 ? ' pour ces filtres' : ''}
                </Texte>
              ) : null}
              <BoutonAlerte filtres={filtres} />
            </View>
          }
          pied={pages > 1 ? <Pagination page={filtres.page} pages={pages} onChange={allerPage} /> : null}
        />
      )}

      <PanneauFiltres
        visible={panneau}
        filtres={filtres}
        onFermer={() => setPanneau(false)}
        onAppliquer={(f) => {
          setFiltres(f)
          setPanneau(false)
        }}
      />
    </SafeAreaView>
  )
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  return (
    <View style={styles.pagination}>
      <View style={styles.plein}>
        <Bouton libelle="Précédente" variante="secondaire" desactive={page <= 1} onPress={() => onChange(page - 1)} />
      </View>
      <Text style={styles.numeroPage}>
        {page} / {pages}
      </Text>
      <View style={styles.plein}>
        <Bouton libelle="Suivante" variante="secondaire" desactive={page >= pages} onPress={() => onChange(page + 1)} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.fond },
  plein: { flex: 1 },
  barre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaces.xl,
    paddingVertical: espaces.m,
    gap: espaces.m,
  },
  actions: { flexDirection: 'row', gap: espaces.s },
  puce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.xs,
    minHeight: 40,
    paddingHorizontal: espaces.m,
    borderRadius: rayons.pilule,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },
  puceRonde: { width: 40, paddingHorizontal: 0, justifyContent: 'center' },
  puceActive: { backgroundColor: couleurs.primaire, borderColor: couleurs.primaire },
  textePuce: { fontSize: 14, fontWeight: '600', color: couleurs.texte },
  entete: { gap: espaces.m, marginBottom: espaces.l },
  pagination: { flexDirection: 'row', alignItems: 'center', gap: espaces.m, marginTop: espaces.l },
  numeroPage: { fontSize: 15, fontWeight: '600', color: couleurs.texte },
  pagesCarte: { paddingHorizontal: espaces.xl, paddingBottom: espaces.m },
})
