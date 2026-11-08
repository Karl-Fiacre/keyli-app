import { Link } from 'react-router-dom'
import { PageJuridique, type SectionJuridique } from '@/components/juridique/PageJuridique'
import { ACompleter } from '@/components/juridique/ACompleter'
import { EMAIL_CONTACT } from '@/partage/lib/juridique'

// Politique de confidentialité — cadre : loi ivoirienne n° 2013-450 du
// 19 juin 2013 relative à la protection des données à caractère personnel,
// autorité de contrôle : ARTCI. Durées de conservation et numéro de
// déclaration à faire valider par un juriste (docs/MODULES/juridique.md).
const lien = 'text-primary-glow hover:underline'

const SECTIONS: SectionJuridique[] = [
  {
    id: 'responsable',
    titre: 'Responsable du traitement',
    contenu: (
      <>
        <p>
          Les données personnelles collectées sur Keyli sont traitées par Nguessan-IT, éditeur de Keyli (coordonnées
          dans les{' '}
          <Link to="/mentions-legales" className={lien}>
            mentions légales
          </Link>
          ), conformément à la loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère
          personnel.
        </p>
        <p>
          Déclaration auprès de l’ARTCI : <ACompleter>numéro de récépissé</ACompleter>
        </p>
      </>
    ),
  },
  {
    id: 'donnees',
    titre: 'Données collectées',
    contenu: (
      <ul>
        <li>Compte : prénom, nom, adresse email, téléphone (facultatif), type de compte, nom d’agence.</li>
        <li>
          Vérification (propriétaires et agences) : pièce d’identité, numéro et date de validité, registre de commerce
          pour une agence.
        </li>
        <li>Annonces : description, prix, photos, quartier et position du bien.</li>
        <li>Échanges : messages, demandes de visite et de réservation, avis, signalements.</li>
        <li>Abonnement : forfait choisi, historique des paiements (sans numéro de carte, traité par Paystack).</li>
        <li>
          Statistiques : consultations et clics sur les annonces, rattachés à un identifiant anonyme conservé dans votre
          navigateur.
        </li>
      </ul>
    ),
  },
  {
    id: 'finalites',
    titre: 'Pourquoi nous les utilisons',
    contenu: (
      <ul>
        <li>Créer et gérer votre compte, vous connecter en sécurité.</li>
        <li>Publier les annonces et mettre en relation chercheurs, propriétaires et agences.</li>
        <li>Vérifier l’identité des annonceurs et lutter contre les fraudes et les fausses annonces.</li>
        <li>Gérer les forfaits et les paiements.</li>
        <li>Vous envoyer les notifications liées à votre compte (désactivables depuis votre profil).</li>
        <li>Mesurer l’audience des annonces et les quartiers recherchés, de façon agrégée.</li>
      </ul>
    ),
  },
  {
    id: 'visibilite',
    titre: 'Ce qui est visible par les autres',
    contenu: (
      <>
        <p>
          Sont publics : les annonces, le nom affiché de l’annonceur, sa photo, son badge, sa note et les avis. Votre
          téléphone et votre email ne sont pas affichés : les échanges passent par la messagerie de Keyli.
        </p>
        <p>
          Vos documents de vérification ne sont jamais publics : seule l’équipe Keyli chargée de la vérification y a
          accès.
        </p>
      </>
    ),
  },
  {
    id: 'sous-traitants',
    titre: 'Prestataires techniques',
    contenu: (
      <>
        <p>
          Nous faisons appel à des prestataires qui traitent des données pour notre compte, et seulement pour cela :
        </p>
        <ul>
          <li>Supabase : base de données, comptes, stockage des fichiers.</li>
          <li>Cloudflare : hébergement et diffusion du site.</li>
          <li>Cloudinary : stockage et optimisation des photos des annonces.</li>
          <li>Paystack : paiement des forfaits.</li>
          <li>Google Maps : affichage des cartes et choix de la position d’un bien.</li>
          <li>Resend : envoi des emails.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'transferts',
    titre: 'Transferts hors de Côte d’Ivoire',
    contenu: (
      <p>
        Certains de ces prestataires hébergent les données hors de Côte d’Ivoire (notamment en Europe et aux
        États-Unis). Ces transferts sont réalisés dans le cadre prévu par la loi n° 2013-450 et sous le contrôle de
        l’ARTCI, avec des prestataires qui s’engagent sur la sécurité et la confidentialité des données.
      </p>
    ),
  },
  {
    id: 'conservation',
    titre: 'Durée de conservation',
    contenu: (
      <ul>
        <li>Données du compte : tant que le compte est ouvert.</li>
        <li>
          Documents de vérification : tant que le badge est actif ; supprimés à la fermeture du compte ou au retrait du
          badge.
        </li>
        <li>
          À la fermeture du compte, les données sont supprimées ou rendues anonymes, sauf celles que la loi oblige à
          garder (par exemple les pièces comptables liées aux paiements), conservées pendant la durée légale.
        </li>
        <li>Statistiques de consultation : utilisées sous forme agrégée, sans identifier les personnes.</li>
      </ul>
    ),
  },
  {
    id: 'droits',
    titre: 'Vos droits',
    contenu: (
      <>
        <p>
          Vous pouvez accéder à vos données, les faire corriger ou supprimer, et vous opposer à leur utilisation pour un
          motif légitime. Vos nom, prénom et téléphone se modifient directement depuis votre profil ; pour le reste,
          écrivez à {EMAIL_CONTACT}. Nous répondons dans un délai d’un mois.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l’ARTCI (Autorité de Régulation des
          Télécommunications/TIC de Côte d’Ivoire).
        </p>
      </>
    ),
  },
  {
    id: 'stockage-navigateur',
    titre: 'Stockage dans le navigateur',
    contenu: (
      <p>
        Keyli n’utilise pas de cookies publicitaires. Le navigateur conserve seulement ce qui est nécessaire au service
        : la session de connexion et un identifiant anonyme de statistiques. Les cartes Google Maps peuvent déposer
        leurs propres éléments techniques.
      </p>
    ),
  },
  {
    id: 'securite',
    titre: 'Sécurité',
    contenu: (
      <p>
        Les échanges sont chiffrés (HTTPS). L’accès aux données est limité, dans la base elle-même, à leur propriétaire
        et aux personnes autorisées. Les documents de vérification sont rangés dans un espace privé.
      </p>
    ),
  },
]

export default function Confidentialite() {
  return (
    <PageJuridique
      titre="Politique de confidentialité"
      introduction={<p>Quelles données Keyli collecte, pourquoi, avec qui elles sont partagées, et vos droits.</p>}
      sections={SECTIONS}
    />
  )
}
