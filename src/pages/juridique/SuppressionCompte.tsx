import { Link } from 'react-router-dom'
import { PageJuridique, type SectionJuridique } from '@/components/juridique/PageJuridique'
import { EMAIL_CONTACT } from '@/partage/lib/juridique'

// Page publique « Supprimer votre compte Keyli » : lien déclaré dans la
// section « Sécurité des données » de Google Play (et pour l'App Store).
// Elle doit rester accessible sans connexion.
const SECTIONS: SectionJuridique[] = [
  {
    id: 'comment',
    titre: 'Comment supprimer votre compte',
    contenu: (
      <>
        <p>Depuis l’application mobile Keyli : Profil → « Supprimer mon compte », puis tapez SUPPRIMER pour confirmer.</p>
        <p>
          Depuis le site : <Link to="/profil#suppression">Mon profil</Link> → « Supprimer mon compte » (connexion
          requise).
        </p>
        <p>
          Vous ne pouvez plus vous connecter ? Écrivez à {EMAIL_CONTACT} depuis l’adresse email de votre compte, avec
          l’objet « Suppression de compte » : nous la traitons sous 30 jours.
        </p>
      </>
    ),
  },
  {
    id: 'efface',
    titre: 'Ce qui est effacé',
    contenu: (
      <ul>
        <li>Vos nom, prénom, téléphone, photo et email (remplacé par une adresse anonyme).</li>
        <li>Vos messages, avis donnés et reçus, favoris, alertes de recherche, notifications et signalements.</li>
        <li>Vos documents de vérification (pièce d’identité, justificatifs), fichiers compris.</li>
        <li>Vos annonces sont retirées du site et de l’application ; vos séjours à venir sont annulés.</li>
      </ul>
    ),
  },
  {
    id: 'conserve',
    titre: 'Ce qui est conservé',
    contenu: (
      <ul>
        <li>
          L’historique des paiements de forfaits, rattaché à un compte anonyme, pendant la durée imposée par la loi
          (obligations comptables).
        </li>
        <li>
          Les réservations passées, rattachées à un compte anonyme, pour l’historique de l’autre partie (hôte ou
          voyageur).
        </li>
      </ul>
    ),
  },
  {
    id: 'delai',
    titre: 'Délai',
    contenu: <p>La suppression depuis le profil est immédiate et définitive : le compte ne peut pas être récupéré.</p>,
  },
]

export default function SuppressionCompte() {
  return (
    <PageJuridique
      titre="Supprimer votre compte Keyli"
      introduction={<p>Comment demander la suppression de votre compte et des données associées.</p>}
      sections={SECTIONS}
    />
  )
}
