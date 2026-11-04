import { PageJuridique, type SectionJuridique } from '@/components/juridique/PageJuridique'
import { ACompleter } from '@/components/juridique/ACompleter'
import { EMAIL_CONTACT } from '@/lib/juridique'

// Mentions légales — les informations encore inconnues sont signalées
// « À COMPLÉTER » et doivent être remplies avant l'ouverture au public.
const SECTIONS: SectionJuridique[] = [
  {
    id: 'editeur',
    titre: 'Éditeur',
    contenu: (
      <ul>
        <li>Nguessan-IT, éditeur de la plateforme Keyli</li>
        <li>
          Forme juridique et capital : <ACompleter>forme juridique, capital</ACompleter>
        </li>
        <li>
          RCCM : <ACompleter>numéro du registre du commerce</ACompleter>
        </li>
        <li>
          Siège : <ACompleter>adresse postale</ACompleter>, Abidjan, Côte d’Ivoire
        </li>
        <li>Contact : {EMAIL_CONTACT}</li>
        <li>Directeur de la publication : Fiacre Nguessan</li>
      </ul>
    ),
  },
  {
    id: 'hebergement',
    titre: 'Hébergement',
    contenu: (
      <ul>
        <li>Site : Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis.</li>
        <li>
          Données : Supabase, Inc., 970 Toa Payoh North #07-04, Singapour 318992 — serveurs situés à Paris (France).
        </li>
      </ul>
    ),
  },
  {
    id: 'propriete',
    titre: 'Propriété intellectuelle',
    contenu: (
      <p>
        Le nom Keyli, son logo, son badge de vérification et l’interface du site appartiennent à Nguessan-IT. Les
        annonceurs restent titulaires des textes et photos de leurs annonces et autorisent Keyli à les afficher pour la
        durée de publication.
      </p>
    ),
  },
  {
    id: 'signaler',
    titre: 'Signaler un contenu',
    contenu: (
      <p>
        Un contenu illicite ou trompeur peut être signalé depuis l’annonce (bouton « Signaler cette annonce ») ou en
        écrivant à {EMAIL_CONTACT}.
      </p>
    ),
  },
]

export default function MentionsLegales() {
  return <PageJuridique titre="Mentions légales" sections={SECTIONS} />
}
