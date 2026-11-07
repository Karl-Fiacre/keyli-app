import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { FormulaireSupport } from '@/components/aide/FormulaireSupport'
import { PageJuridique, type SectionJuridique } from '@/components/juridique/PageJuridique'
import { EMAIL_CONTACT } from '@/lib/juridique'

// Aide : questions fréquentes, regroupées par thème, et contact (formulaire
// ouvert à tous depuis le Sprint 7 — docs/MODULES/ouverture-grand-public.md).
const lien = 'text-primary-glow hover:underline'

function Question({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border p-4 open:bg-secondary/40">
      <summary className="cursor-pointer font-semibold marker:text-primary-glow">{question}</summary>
      <div className="mt-2 text-muted-foreground">{children}</div>
    </details>
  )
}

const SECTIONS: SectionJuridique[] = [
  {
    id: 'chercher',
    titre: 'Chercher un logement',
    contenu: (
      <>
        <Question question="Keyli est-il gratuit pour chercher ?">
          Oui. Chercher, enregistrer des favoris, contacter un annonceur et demander une visite sont gratuits.
        </Question>
        <Question question="Que signifie le badge « Vérifié » ?">
          L’équipe Keyli a contrôlé la pièce d’identité de l’annonceur (et le registre de commerce pour une agence). Le
          badge ne garantit pas le bien lui-même : visitez toujours avant de payer.
        </Question>
        <Question question="Comment éviter les arnaques ?">
          Ne versez jamais d’argent avant d’avoir visité le bien et vu les documents de propriété. Méfiez-vous d’un prix
          très bas ou d’une demande de paiement urgente, et signalez l’annonce avec le bouton « Signaler cette annonce
          ».
        </Question>
        <Question question="Où se trouve exactement le bien ?">
          Pour protéger les annonceurs, la carte montre une zone approximative. Demandez l’adresse précise à l’annonceur
          par la messagerie, avant la visite.
        </Question>
        <Question question="Comment réserver un séjour court ?">
          Sur la fiche du bien, choisissez vos dates et envoyez une demande. L’hôte l’accepte ou la refuse ; le séjour
          se règle directement avec lui.
        </Question>
      </>
    ),
  },
  {
    id: 'publier',
    titre: 'Publier une annonce',
    contenu: (
      <>
        <Question question="Combien coûte la publication ?">
          Les propriétaires et les agences choisissent un forfait mensuel ; les prix sont sur la page{' '}
          <Link to="/abonnement" className={lien}>
            Abonnement
          </Link>
          .
        </Question>
        <Question question="J’ai plusieurs biens ou une agence : pouvez-vous m’aider ?">
          Oui. Faites une demande sur la page{' '}
          <Link to="/partenaires" className={lien}>
            Devenir partenaire
          </Link>{' '}
          : l’équipe vous rappelle pour créer votre compte et publier vos premières annonces.
        </Question>
        <Question question="Comment obtenir le badge ?">
          Depuis votre profil, envoyez votre pièce d’identité (et votre registre de commerce pour une agence). L’équipe
          Keyli vous répond après examen.
        </Question>
      </>
    ),
  },
  {
    id: 'compte',
    titre: 'Mon compte',
    contenu: (
      <>
        <Question question="Je n’ai pas reçu l’email de confirmation">
          Regardez dans les courriers indésirables, puis demandez un nouvel envoi depuis la page « Vérifiez votre email
          » affichée après l’inscription.
        </Question>
        <Question question="J’ai oublié mon mot de passe">
          Utilisez «{' '}
          <Link to="/mot-de-passe-oublie" className={lien}>
            Mot de passe oublié
          </Link>{' '}
          » : un lien de réinitialisation vous est envoyé par email.
        </Question>
        <Question question="Comment ne plus recevoir les emails ?">
          Depuis votre profil, ou par le lien en bas de chaque email.
        </Question>
        <Question question="Comment fermer mon compte ?">
          Envoyez-nous une demande (sujet « Mon compte ») avec le formulaire ci-dessous, en indiquant l’adresse email de
          votre compte.
        </Question>
      </>
    ),
  },
  {
    id: 'contact',
    titre: 'Nous contacter',
    contenu: (
      <div className="space-y-4">
        <FormulaireSupport />
        <p className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-primary-glow" aria-hidden />
          Ou par email :{' '}
          <a href={`mailto:${EMAIL_CONTACT}`} className={lien}>
            {EMAIL_CONTACT}
          </a>
        </p>
      </div>
    ),
  },
]

export default function Aide() {
  return (
    <PageJuridique
      titre="Aide"
      introduction={
        <p>
          Les réponses aux questions les plus fréquentes. Une autre question ?{' '}
          <a href="#contact" className={lien}>
            Écrivez-nous
          </a>
          , même sans compte.
        </p>
      }
      sections={SECTIONS}
    />
  )
}
