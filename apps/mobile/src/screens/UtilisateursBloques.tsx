// Utilisateurs bloqués, avec « Débloquer » — mêmes hooks que le web
// (src/components/profil/UtilisateursBloques.tsx). La base refuse tout
// message entre deux comptes dont l'un a bloqué l'autre.
import { View } from 'react-native'
import { useDebloquer, useMesBlocages } from '@/partage/hooks/useBlocages'
import { messageErreur } from '@/partage/lib/erreurs'
import { Bouton, Carte, Chargement, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { espaces } from '@mobile/theme/tokens'

export default function UtilisateursBloques() {
  const blocages = useMesBlocages()
  const debloquer = useDebloquer()
  if (blocages.isPending) return <Chargement />

  return (
    <Ecran>
      <Titre>Utilisateurs bloqués</Titre>
      <Texte attenue>Ils ne peuvent plus vous écrire, et vous ne pouvez plus leur écrire.</Texte>
      {blocages.isError ? <Message>{messageErreur(blocages.error)}</Message> : null}
      {debloquer.isError ? <Message>{messageErreur(debloquer.error)}</Message> : null}
      {blocages.data?.length === 0 ? <Texte>Vous n'avez bloqué personne.</Texte> : null}
      {blocages.data?.map((b) => (
        <Carte key={b.bloque_id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaces.m }}>
            <View style={{ flex: 1 }}>
              <Texte>{b.nom}</Texte>
            </View>
            <Bouton
              libelle="Débloquer"
              variante="secondaire"
              desactive={debloquer.isPending}
              onPress={() => debloquer.mutate(b.bloque_id)}
            />
          </View>
        </Carte>
      ))}
    </Ecran>
  )
}
