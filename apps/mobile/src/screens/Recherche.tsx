// Recherche — socle du Sprint 13 : location ou vente, tri. Les filtres
// complets et la carte arrivent au Sprint 14 (docs/calendrier.md).
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { FiltresRecherche, TriRecherche } from '@/partage/hooks/useRecherche'
import type { StatutBien } from '@/partage/hooks/useAnnonces'
import { LIBELLES_TRI } from '@/partage/lib/recherche'
import { ListeAnnonces } from '@mobile/composants/ListeAnnonces'
import { Choix, Titre } from '@mobile/composants/base'
import { couleurs, espaces } from '@mobile/theme/tokens'

type ChoixStatut = 'tous' | StatutBien

const STATUTS: readonly { valeur: ChoixStatut; libelle: string }[] = [
  { valeur: 'tous', libelle: 'Tout' },
  { valeur: 'a_louer', libelle: 'À louer' },
  { valeur: 'a_vendre', libelle: 'À vendre' },
]
const TRIS = (Object.keys(LIBELLES_TRI) as TriRecherche[]).map((t) => ({ valeur: t, libelle: LIBELLES_TRI[t] }))

export default function Recherche() {
  const [statut, setStatut] = useState<ChoixStatut>('tous')
  const [tri, setTri] = useState<TriRecherche>('pertinence')
  const filtres = useMemo<FiltresRecherche>(
    () => ({ avantages: [], tri, page: 1, statut: statut === 'tous' ? undefined : statut }),
    [statut, tri],
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: couleurs.fond }} edges={['top']}>
      <ListeAnnonces
        filtres={filtres}
        entete={
          <View style={{ gap: espaces.m, marginBottom: espaces.l }}>
            <Titre>Rechercher</Titre>
            <Choix libelle="Annonces" options={STATUTS} valeur={statut} onChange={setStatut} />
            <Choix libelle="Trier par" options={TRIS} valeur={tri} onChange={setTri} />
          </View>
        }
      />
    </SafeAreaView>
  )
}
