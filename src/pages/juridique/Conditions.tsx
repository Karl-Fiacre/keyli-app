import { Link } from 'react-router-dom'
import { PageJuridique, type SectionJuridique } from '@/components/juridique/PageJuridique'
import { EMAIL_CONTACT } from '@/lib/juridique'

// Conditions générales d'utilisation, version VERSION_CGU (src/lib/juridique.ts).
// Toute modification de fond = nouvelle version (docs/MODULES/juridique.md).
// Texte à faire relire par un juriste avant l'ouverture au public.
const lien = 'text-primary-glow hover:underline'

const SECTIONS: SectionJuridique[] = [
  {
    id: 'objet',
    titre: 'Objet',
    contenu: (
      <p>
        Keyli est une plateforme en ligne de mise en relation pour la location et la vente de biens immobiliers en Côte
        d’Ivoire, éditée par Nguessan-IT (voir les{' '}
        <Link to="/mentions-legales" className={lien}>
          mentions légales
        </Link>
        ). Les présentes conditions encadrent l’utilisation du site et de l’application par toute personne, inscrite ou
        non.
      </p>
    ),
  },
  {
    id: 'acceptation',
    titre: 'Acceptation et évolution des conditions',
    contenu: (
      <>
        <p>
          La création d’un compte suppose l’acceptation des présentes conditions. Keyli enregistre la version acceptée
          et sa date.
        </p>
        <p>
          Keyli peut faire évoluer ces conditions. Chaque nouvelle version est datée ; elle doit être acceptée à la
          connexion suivante pour continuer à utiliser son compte. La consultation des annonces reste libre.
        </p>
      </>
    ),
  },
  {
    id: 'comptes',
    titre: 'Comptes',
    contenu: (
      <ul>
        <li>
          Trois types de comptes : chercheur de logement (gratuit), propriétaire et agence (forfait payant pour
          publier).
        </li>
        <li>Les informations fournies doivent être exactes et tenues à jour ; l’adresse email doit être confirmée.</li>
        <li>
          Le compte est personnel. Son titulaire garde son mot de passe secret et répond des actions faites depuis son
          compte.
        </li>
        <li>Le nom d’une agence vérifiée ne se modifie plus que sur demande à l’équipe Keyli.</li>
      </ul>
    ),
  },
  {
    id: 'verification',
    titre: 'Vérification et badge',
    contenu: (
      <>
        <p>
          Les propriétaires et les agences peuvent demander la vérification de leur identité (pièce d’identité, registre
          de commerce pour une agence). Le badge « Vérifié » signifie que ces documents ont été contrôlés par l’équipe
          Keyli à la date de la vérification.
        </p>
        <p>
          Le badge n’est pas une garantie du bien, de son état ni de l’issue d’une transaction. Il peut être retiré en
          cas de document expiré, de fausse déclaration ou de manquement aux présentes conditions.
        </p>
      </>
    ),
  },
  {
    id: 'annonces',
    titre: 'Annonces',
    contenu: (
      <ul>
        <li>
          L’annonceur publie uniquement des biens qu’il a le droit de louer ou de vendre, avec une description, un prix
          et des photos fidèles.
        </li>
        <li>
          Sont interdits : les annonces fictives ou en double, les prix trompeurs, les photos d’un autre bien, la
          demande d’argent avant toute visite, tout contenu illicite, discriminatoire ou injurieux.
        </li>
        <li>
          Keyli peut masquer ou retirer une annonce signalée ou contraire aux présentes conditions, et suspendre le
          compte concerné.
        </li>
      </ul>
    ),
  },
  {
    id: 'forfaits',
    titre: 'Forfaits et paiement',
    contenu: (
      <>
        <p>
          La publication d’annonces par les propriétaires et les agences est soumise à un forfait mensuel, dont le prix
          et le nombre d’annonces inclus sont affichés sur la page{' '}
          <Link to="/abonnement" className={lien}>
            Abonnement
          </Link>{' '}
          avant tout paiement. Au-delà du nombre inclus, chaque annonce supplémentaire mise en ligne dans le mois est
          facturée au prix affiché et ajoutée au paiement suivant.
        </p>
        <p>
          Le paiement est traité par notre prestataire de paiement (Paystack) ; Keyli ne voit ni ne conserve les numéros
          de carte. Un forfait non renouvelé ne permet plus de publier de nouvelles annonces.
        </p>
      </>
    ),
  },
  {
    id: 'reservations',
    titre: 'Séjours courts et réservations',
    contenu: (
      <p>
        Pour les séjours courts, une demande de réservation est envoyée à l’hôte, qui l’accepte ou la refuse. Keyli
        n’encaisse aucun paiement pour les séjours : le prix se règle directement avec l’hôte, selon ses conditions. Une
        réservation peut être annulée dans l’application jusqu’au jour d’arrivée.
      </p>
    ),
  },
  {
    id: 'role-keyli',
    titre: 'Rôle de Keyli',
    contenu: (
      <p>
        Keyli met en relation les personnes qui cherchent un bien et celles qui le proposent. Keyli n’est partie à aucun
        bail, aucune vente ni aucun séjour conclu entre utilisateurs, et n’est ni agent immobilier ni mandataire. Nous
        recommandons de visiter le bien et de vérifier les documents de propriété avant tout versement d’argent.
      </p>
    ),
  },
  {
    id: 'messagerie',
    titre: 'Messagerie, avis et signalements',
    contenu: (
      <ul>
        <li>
          La messagerie sert aux échanges sur une annonce ; le harcèlement, le démarchage et les arnaques sont
          interdits.
        </li>
        <li>Les avis sont publics : ils doivent être sincères, porter sur une expérience vécue et rester courtois.</li>
        <li>
          Tout utilisateur peut signaler une annonce ou un comportement. L’équipe Keyli examine chaque signalement et
          peut avertir, retirer un contenu ou suspendre un compte.
        </li>
      </ul>
    ),
  },
  {
    id: 'responsabilite',
    titre: 'Responsabilité',
    contenu: (
      <p>
        Keyli s’efforce de rendre le service disponible et sûr, sans pouvoir garantir une disponibilité permanente.
        Chaque utilisateur est responsable des contenus qu’il publie et des engagements qu’il prend avec d’autres
        utilisateurs.
      </p>
    ),
  },
  {
    id: 'fin',
    titre: 'Suspension et fermeture du compte',
    contenu: (
      <p>
        Keyli peut suspendre un compte en cas de manquement, en indiquant le motif. L’utilisateur peut demander la
        fermeture de son compte à tout moment en écrivant à {EMAIL_CONTACT}. Le sort des données à la fermeture est
        décrit dans la{' '}
        <Link to="/confidentialite" className={lien}>
          politique de confidentialité
        </Link>
        .
      </p>
    ),
  },
  {
    id: 'droit',
    titre: 'Droit applicable et litiges',
    contenu: (
      <p>
        Les présentes conditions sont régies par le droit ivoirien. En cas de différend, une solution amiable est
        recherchée d’abord en écrivant à {EMAIL_CONTACT} ; à défaut, les tribunaux d’Abidjan sont compétents.
      </p>
    ),
  },
]

export default function Conditions() {
  return (
    <PageJuridique
      titre="Conditions générales d’utilisation"
      introduction={
        <p>Les règles d’utilisation de Keyli, pour les chercheurs de logement, les propriétaires et les agences.</p>
      }
      sections={SECTIONS}
    />
  )
}
