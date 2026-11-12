// Abonnement (Sprint 17, choix du porteur du 2026-11-11 « Android paie,
// iPhone affiche ») :
// * Android : choix du forfait et paiement Paystack dans le navigateur
//   intégré, puis vérification par le serveur au retour dans l'application ;
// * iPhone : forfait, échéance et état du dernier paiement seulement — ni
//   bouton de paiement ni lien d'achat (règle App Store 3.1.1).
// Mêmes hooks que la page web : le montant est fixé par la base, le client
// n'envoie jamais de prix.
import { useEffect, useRef, useState } from 'react'
import { AppState, Platform, Text, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import {
  useAbonnementActif,
  useDepassementsAPayer,
  useDerniereTentativePaiement,
  useDernierAbonnementExpire,
  useForfaits,
  usePaiementForfait,
  useVerificationPaiement,
  type Forfait,
} from '@/partage/hooks/useAbonnement'
import { useProfil } from '@/partage/hooks/useProfil'
import { formatXof } from '@/partage/lib/format'
import { motifRefus } from '@/partage/lib/paiements'
import { messageErreur } from '@/partage/lib/erreurs'
import { Bouton, Carte, Chargement, Ecran, Message, Texte, Titre } from '@mobile/composants/base'
import { couleurs, espaces, rayons } from '@mobile/theme/tokens'

const JOUR = 86_400_000
const PAIEMENT_DANS_APP = Platform.OS === 'android'

function libelleAnnonces(f: Forfait) {
  return f.seuil_max ? `${f.seuil_min} à ${f.seuil_max} annonces par mois` : `${f.seuil_min} annonces et plus par mois`
}

function date(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function Abonnement() {
  const profil = useProfil()
  const forfaits = useForfaits()
  const abonnement = useAbonnementActif()
  const actuel = abonnement.data
  const expire = useDernierAbonnementExpire(!!actuel || abonnement.isPending).data
  const depassements = useDepassementsAPayer().data ?? []
  const derniere = useDerniereTentativePaiement().data
  const paiement = usePaiementForfait()
  const verification = useVerificationPaiement()
  const verifier = verification.mutate
  const [aConfirmer, setAConfirmer] = useState<string | null>(null)
  // Paiement ouvert dans le navigateur, à vérifier au retour
  const enCours = useRef<string | null>(null)

  // Retour dans l'application après la page Paystack : le serveur confirme
  useEffect(() => {
    if (!PAIEMENT_DANS_APP) return
    const abonnementEtat = AppState.addEventListener('change', (etat) => {
      if (etat === 'active' && enCours.current) {
        const reference = enCours.current
        enCours.current = null
        verifier(reference)
      }
    })
    return () => abonnementEtat.remove()
  }, [verifier])

  if (profil.isPending || forfaits.isPending || abonnement.isPending) return <Chargement />

  const role = profil.data?.role_keyli
  if (role !== 'owner' && role !== 'agency') {
    return (
      <Ecran>
        <Titre>Abonnement</Titre>
        <Texte>La recherche de logement est gratuite : aucun abonnement n'est nécessaire pour un compte chercheur.</Texte>
      </Ecran>
    )
  }

  // Une agence ne peut pas prendre le forfait Propriétaire (règle aussi en base)
  const proposes = (forfaits.data ?? []).filter((f) => !(role === 'agency' && f.code === 'proprietaire'))
  const totalDepassements = depassements.reduce((s, d) => s + Number(d.montant), 0)
  const joursRestants = actuel ? Math.max(0, Math.ceil((new Date(actuel.end_date).getTime() - Date.now()) / JOUR)) : 0
  // Paiement refusé récemment (moins de 7 jours) et pas encore retenté
  const refus =
    derniere?.status === 'failed' && Date.now() - new Date(derniere.created_at ?? 0).getTime() < 7 * JOUR
      ? derniere
      : null

  const payer = (planId: string) =>
    paiement.mutate(planId, {
      onSuccess: async ({ authorization_url, reference }) => {
        setAConfirmer(null)
        enCours.current = reference
        await WebBrowser.openBrowserAsync(authorization_url, {
          toolbarColor: couleurs.navyLogo,
          showTitle: true,
        })
      },
    })

  const resultat = verification.data
  return (
    <Ecran>
      <Titre>Mon abonnement</Titre>
      {actuel ? (
        <Carte style={{ gap: espaces.xs }}>
          <Texte>Forfait {actuel.plans_keyli?.nom}</Texte>
          <Texte attenue>
            Actif jusqu'au {date(actuel.end_date)}
            {joursRestants > 0 ? ` (${joursRestants} jour${joursRestants > 1 ? 's' : ''})` : ''}
          </Texte>
        </Carte>
      ) : (
        <Texte attenue>Aucun abonnement actif : vos annonces ne sont pas visibles du public.</Texte>
      )}

      {!actuel && expire ? (
        <Message>
          Votre forfait {expire.plans_keyli?.nom} a expiré le {date(expire.end_date)} : vos annonces ne sont plus
          visibles du public.
        </Message>
      ) : null}

      {refus ? (
        <Message>
          Votre dernier paiement ({formatXof(Number(refus.amount))}, forfait {refus.plans_keyli?.nom ?? 'choisi'}) n'a
          pas abouti. {motifRefus(refus.motif_refus)} Votre abonnement n'a pas été modifié.
        </Message>
      ) : null}

      {totalDepassements > 0 ? (
        <Message>
          Dépassements de forfait à régler : {formatXof(totalDepassements)}, ajoutés au prochain paiement.
        </Message>
      ) : null}

      {verification.isPending ? <Texte attenue>Vérification du paiement…</Texte> : null}
      {resultat?.statut === 'success' ? <Message type="succes">Paiement confirmé : votre abonnement est à jour.</Message> : null}
      {resultat && resultat.statut !== 'success' ? (
        <Message>
          {resultat.statut === 'pending'
            ? 'Paiement pas encore confirmé. Revenez sur cet écran dans quelques minutes.'
            : `Le paiement n'a pas abouti. ${motifRefus(resultat.motif)}`}
        </Message>
      ) : null}
      {verification.isError ? <Message>{messageErreur(verification.error)}</Message> : null}
      {paiement.isError ? <Message>{messageErreur(paiement.error)}</Message> : null}

      {PAIEMENT_DANS_APP ? (
        <>
          {proposes.map((f) => {
            const estActuel = actuel?.plan_id === f.id
            const total = Number(f.prix_mensuel) + totalDepassements
            return (
              <Carte
                key={f.id}
                style={{
                  gap: espaces.s,
                  borderWidth: estActuel ? 2 : 0,
                  borderColor: couleurs.primaire,
                  borderRadius: rayons.carte,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '700', color: couleurs.texte }}>
                  {f.nom}
                  {estActuel ? ' · actuel' : ''}
                </Text>
                <Texte attenue>{libelleAnnonces(f)}</Texte>
                <Text style={{ fontSize: 20, fontWeight: '700', color: couleurs.texte }}>
                  {formatXof(Number(f.prix_mensuel))}
                  <Text style={{ fontSize: 14, fontWeight: '400', color: couleurs.attenue }}> / mois</Text>
                </Text>
                {totalDepassements > 0 ? (
                  <Texte attenue>À payer maintenant : {formatXof(total)} (dépassements inclus)</Texte>
                ) : null}
                {aConfirmer === f.id && actuel ? (
                  <View style={{ gap: espaces.s }}>
                    <Message>
                      Changement immédiat : votre forfait {actuel.plans_keyli?.nom} s'arrête aujourd'hui
                      {joursRestants > 0 ? ` (${joursRestants} jour(s) non utilisé(s), sans remboursement)` : ''} et
                      le forfait {f.nom} démarre pour un mois. Montant : {formatXof(total)}.
                    </Message>
                    <Bouton libelle="Confirmer et payer" chargement={paiement.isPending} onPress={() => payer(f.id)} />
                    <Bouton libelle="Annuler" variante="lien" onPress={() => setAConfirmer(null)} />
                  </View>
                ) : (
                  <Bouton
                    libelle={estActuel ? "Prolonger d'un mois" : actuel ? 'Passer à ce forfait' : 'Choisir ce forfait'}
                    variante={estActuel ? 'secondaire' : 'primaire'}
                    chargement={paiement.isPending && paiement.variables === f.id}
                    desactive={paiement.isPending}
                    // Changer de forfait en cours d'abonnement se confirme d'abord
                    onPress={() => (actuel && !estActuel ? setAConfirmer(f.id) : payer(f.id))}
                  />
                )}
              </Carte>
            )
          })}
          <Texte attenue>
            Paiement sécurisé par Paystack (carte bancaire, Mobile Money). Votre abonnement est activé dès la
            confirmation du paiement.
          </Texte>
        </>
      ) : null}
    </Ecran>
  )
}
