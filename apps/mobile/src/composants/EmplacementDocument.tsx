// Un document de vérification sur téléphone (Sprint 16) — même logique que
// le web (src/components/verification/EmplacementDocument.tsx) : statut du
// dernier envoi, motif d'un refus, et envoi possible s'il n'y a rien ou si
// le document a été refusé. Source : caméra, galerie ou PDF ; aperçu à
// confirmer avant l'envoi.
import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  LIBELLES_DOCUMENT,
  useEnvoyerDocument,
  type StatutDocument,
  type TypeDocument,
} from '@/partage/hooks/useVerification'
import { messageErreur } from '@/partage/lib/erreurs'
import { formatDate } from '@/partage/lib/format'
import { Bouton, Carte, Message } from '@mobile/composants/base'
import {
  choisirPdf,
  choisirPhotoDocument,
  photographierDocument,
  type DocumentPrepare,
} from '@mobile/services/native/documents'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'

const STATUTS: Record<StatutDocument, { libelle: string; fond: string; texte: string }> = {
  pending: { libelle: "En cours d'examen", fond: couleurs.secondaire, texte: couleurs.attenteTexte },
  approved: { libelle: 'Approuvé', fond: couleurs.succesFond, texte: couleurs.succesTexte },
  rejected: { libelle: 'À renvoyer', fond: couleurs.erreurFond, texte: couleurs.erreurTexte },
}

export function EmplacementDocument({
  type,
  titre,
  propertyId,
  document,
}: {
  type: TypeDocument
  // Titre affiché (par défaut le nom du document)
  titre?: string
  propertyId?: string
  document?: { status: StatutDocument | null; review_notes: string | null; created_at: string | null }
}) {
  const envoi = useEnvoyerDocument()
  const [prepare, setPrepare] = useState<DocumentPrepare | null>(null)
  const [preparation, setPreparation] = useState(false)
  const [probleme, setProbleme] = useState<string>()
  const statut = document?.status ?? null
  const peutEnvoyer = !statut || statut === 'rejected'

  const choisir = async (source: () => Promise<DocumentPrepare | null>) => {
    setProbleme(undefined)
    envoi.reset()
    setPreparation(true)
    try {
      const d = await source()
      if (d) setPrepare(d)
    } catch (e) {
      setProbleme(messageErreur(e))
    } finally {
      setPreparation(false)
    }
  }

  const envoyer = () => {
    if (!prepare) return
    envoi.mutate(
      { type, fichier: prepare.fichier, propertyId },
      { onSuccess: () => setPrepare(null) },
    )
  }

  return (
    <Carte style={{ gap: espaces.s }}>
      <View style={styles.entete}>
        <Text style={styles.titre}>{titre ?? LIBELLES_DOCUMENT[type]}</Text>
        {statut ? (
          <View style={[styles.statut, { backgroundColor: STATUTS[statut].fond }]}>
            <Text style={[styles.texteStatut, { color: STATUTS[statut].texte }]}>{STATUTS[statut].libelle}</Text>
          </View>
        ) : (
          <Text style={styles.aide}>Non envoyé</Text>
        )}
      </View>
      {titre ? <Text style={styles.aide}>{LIBELLES_DOCUMENT[type]}</Text> : null}
      {statut === 'pending' && document?.created_at ? (
        <Text style={styles.aide}>Envoyé le {formatDate(document.created_at)}. L'équipe Keyli l'examine.</Text>
      ) : null}
      {statut === 'rejected' && document?.review_notes ? (
        <Text style={styles.motif}>Motif : {document.review_notes}</Text>
      ) : null}

      {peutEnvoyer && prepare ? (
        <View style={{ gap: espaces.s }}>
          {prepare.apercu ? (
            <Image source={{ uri: prepare.apercu }} style={styles.apercu} resizeMode="contain" accessible={false} />
          ) : (
            <View style={styles.pdf}>
              <Ionicons name="document-text-outline" size={22} color={couleurs.primaire} />
              <Text style={styles.nomPdf} numberOfLines={1}>
                {prepare.nom}
              </Text>
            </View>
          )}
          <Text style={styles.aide}>Vérifiez que tout le document est net et lisible avant de l'envoyer.</Text>
          <Bouton libelle="Envoyer ce document" onPress={envoyer} chargement={envoi.isPending} />
          <Bouton
            libelle="Choisir un autre fichier"
            variante="lien"
            desactive={envoi.isPending}
            onPress={() => setPrepare(null)}
          />
        </View>
      ) : null}

      {peutEnvoyer && !prepare ? (
        <View style={{ gap: espaces.s }}>
          <View style={styles.sources}>
            <Source icone="camera-outline" libelle="Photographier" onPress={() => void choisir(photographierDocument)} />
            <Source icone="images-outline" libelle="Galerie" onPress={() => void choisir(choisirPhotoDocument)} />
            <Source icone="document-outline" libelle="PDF" onPress={() => void choisir(choisirPdf)} />
          </View>
          <Text style={styles.aide}>
            {preparation
              ? 'Préparation du document…'
              : 'Posez la pièce à plat, bien éclairée, sans reflet. PDF, JPEG ou PNG — 5 Mo au maximum.'}
          </Text>
        </View>
      ) : null}

      {probleme ? <Message>{probleme}</Message> : null}
      {envoi.isError ? <Message>{messageErreur(envoi.error)}</Message> : null}
      {envoi.isSuccess ? <Message type="succes">Document envoyé. Vous serez notifié de la décision.</Message> : null}
    </Carte>
  )
}

function Source({
  icone,
  libelle,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap
  libelle: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.source}>
      <Ionicons name={icone} size={22} color={couleurs.primaire} />
      <Text style={styles.texteSource}>{libelle}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  entete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaces.s },
  titre: { flex: 1, fontSize: 15, fontWeight: '600', color: couleurs.texte },
  statut: { borderRadius: rayons.pilule, paddingHorizontal: espaces.s, paddingVertical: 2 },
  texteStatut: { fontSize: 12, fontWeight: '700' },
  aide: { fontSize: 13, lineHeight: 18, color: couleurs.attenue },
  motif: { fontSize: 13, lineHeight: 18, color: couleurs.erreurTexte },
  sources: { flexDirection: 'row', gap: espaces.s },
  source: {
    flex: 1,
    alignItems: 'center',
    gap: espaces.xs,
    paddingVertical: espaces.m,
    borderRadius: rayons.champ,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: couleurs.attenue,
    backgroundColor: couleurs.fond,
  },
  texteSource: { fontSize: 13, fontWeight: '600', color: couleurs.primaire },
  apercu: { width: '100%', height: 220, borderRadius: rayons.champ, backgroundColor: couleurs.fond },
  pdf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaces.s,
    padding: espaces.m,
    borderRadius: rayons.champ,
    backgroundColor: couleurs.fond,
  },
  nomPdf: { flex: 1, fontSize: 14, color: couleurs.texte },
})
