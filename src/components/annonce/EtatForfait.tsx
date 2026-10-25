import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'

export interface EtatPublication {
  statut: string
  plan_code: string | null
  seuil_max: number | null
  publications_cycle: number
  prix_depassement: number | null
}

const formatXof = (v: number) => `${new Intl.NumberFormat('fr-FR').format(v)} XOF`

// Compteur du cycle et raison d'un éventuel blocage — valeurs calculées par
// la base (etat_publication_keyli), jamais recalculées ici.
export function EtatForfait({ etat }: { etat: EtatPublication }) {
  const lien = (texte: string) => (
    <Link to="/abonnement" className="font-semibold text-primary-glow hover:underline">
      {texte}
    </Link>
  )

  switch (etat.statut) {
    case 'sans_abonnement':
      return (
        <Alert variant="erreur">
          Un abonnement actif est nécessaire pour publier une annonce. {lien('Choisir un forfait')}
        </Alert>
      )
    case 'registre_requis':
      return (
        <Alert variant="erreur">
          Votre registre de commerce doit être approuvé par l'équipe Keyli avant votre première publication.
        </Alert>
      )
    case 'bloquee':
      return (
        <Alert variant="erreur">
          Votre forfait est limité à {etat.seuil_max} annonces ce mois-ci et vous les avez toutes utilisées.{' '}
          {lien('Passer au forfait Grande Agence')}
        </Alert>
      )
  }

  const compteur = etat.seuil_max
    ? `${etat.publications_cycle} / ${etat.seuil_max} annonces ce mois-ci`
    : `${etat.publications_cycle} annonces ce mois-ci`

  return (
    <Alert>
      <p className="font-medium">{compteur}</p>
      {etat.statut === 'depassement' && etat.prix_depassement !== null && (
        <p className="mt-1 text-muted-foreground">
          Cette annonce dépasse votre forfait : {formatXof(Number(etat.prix_depassement))} par mois, ajoutés à votre
          prochain paiement tant que vous dépassez le seuil. Votre accord vous sera demandé avant la publication.
        </p>
      )}
      {etat.statut === 'couverte_negociee' && (
        <p className="mt-1 text-muted-foreground">Au-delà du seuil : couvert par votre formule personnalisée.</p>
      )}
    </Alert>
  )
}

// Accord explicite du dépassement, obligatoire pour CETTE publication
export function AccordDepassement({
  prix,
  coche,
  onChange,
}: {
  prix: number
  coche: boolean
  onChange: (valeur: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-pending/40 bg-pending/10 p-4 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-primary"
        checked={coche}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        J'accepte que cette annonce, au-delà de mon forfait, me soit facturée{' '}
        <strong>{formatXof(prix)} par mois</strong> avec mon prochain paiement, tant que je dépasse le seuil.
      </span>
    </label>
  )
}
