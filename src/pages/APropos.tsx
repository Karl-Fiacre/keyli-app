import { Link } from 'react-router-dom'
import { FileCheck2, Flag, Mail, MapPinned, MessageSquareQuote, ShieldCheck } from 'lucide-react'
import { MotifToits } from '@/components/accueil/MotifToits'
import { ParcoursConfiance } from '@/components/accueil/ParcoursConfiance'
import { EspaceAnnonceurs } from '@/components/accueil/EspaceAnnonceurs'
import { BandeauVision } from '@/components/accueil/BandeauVision'
import { ZoneRevele } from '@/components/animation/ZoneRevele'
import { delaiCascade } from '@/lib/animation'
import { EMAIL_CONTACT } from '@/lib/juridique'

// Page « À propos » (décision du porteur, 2026-11-04) : qui sommes-nous,
// garanties, fonctionnement, espace annonceurs et vision — les blocs de
// présentation quittent l'accueil, qui garde la recherche et le catalogue.
// Registre « public » de DESIGN_SYSTEM.md, aucun chiffre inventé.
const GARANTIES = [
  {
    icone: FileCheck2,
    titre: 'Documents contrôlés',
    texte: 'Pièce d’identité et documents du bien vérifiés par l’équipe Keyli avant l’attribution du badge.',
  },
  {
    icone: ShieldCheck,
    titre: 'Agences identifiées',
    texte: 'Registre de commerce exigé pour chaque agence ; son nom est figé une fois vérifiée.',
  },
  {
    icone: MessageSquareQuote,
    titre: 'Avis après visite',
    texte: 'Seules les personnes qui ont réellement visité un bien peuvent le noter.',
  },
  {
    icone: Flag,
    titre: 'Signalements examinés',
    texte: 'Chaque annonce signalée est examinée ; les fraudeurs sont suspendus.',
  },
  {
    icone: MapPinned,
    titre: 'Adresses protégées',
    texte: 'La carte montre un quartier, jamais l’adresse exacte : elle se donne par la messagerie.',
  },
]

export default function APropos() {
  return (
    <>
      {/* Qui sommes-nous */}
      <section
        className="relative isolate overflow-hidden bg-primary py-16 text-primary-foreground md:py-24"
        aria-labelledby="titre-apropos"
      >
        <MotifToits className="absolute inset-0 -z-10 h-full w-full opacity-[0.12]" />
        <ZoneRevele className="container">
          <div className="kf-revele max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-turquoise">À propos de Keyli</p>
            <h1 id="titre-apropos" className="mt-2 font-titre text-4xl font-bold md:text-5xl">
              L’immobilier de confiance, à Abidjan d’abord.
            </h1>
            <p className="mt-5 text-lg text-primary-foreground/85">
              Fausses annonces, frais de visite exigés d’avance, biens qui n’existent pas : chercher un logement est
              souvent une épreuve. Keyli met en relation chercheurs, propriétaires et agences sur une plateforme où
              chaque annonceur peut être identifié et chaque avis vient d’une vraie visite.
            </p>
            <p className="mt-4 text-primary-foreground/85">Keyli est conçue et éditée à Abidjan par Nguessan-IT.</p>
          </div>
        </ZoneRevele>
      </section>

      {/* Nos garanties */}
      <section className="container py-16 md:py-20" aria-labelledby="titre-garanties">
        <ZoneRevele>
          <div className="kf-revele mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-glow">Nos garanties</p>
            <h2 id="titre-garanties" className="mt-1 font-titre text-3xl font-bold md:text-4xl">
              Ce que le badge « Vérifié » veut dire
            </h2>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GARANTIES.map(({ icone: Icone, titre, texte }, i) => (
              <li
                key={titre}
                className="kf-revele rounded-accueil border bg-card p-6 shadow-card"
                style={delaiCascade(i + 1, 70)}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary-glow">
                  <Icone className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-bold">{titre}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{texte}</p>
              </li>
            ))}
          </ul>
        </ZoneRevele>
      </section>

      <ParcoursConfiance />

      <div className="pt-16 md:pt-20">
        <EspaceAnnonceurs />
      </div>

      <BandeauVision />

      {/* Candidature au pilote (Sprint 5) */}
      <section className="container py-14 text-center" aria-labelledby="titre-rejoindre">
        <ZoneRevele>
          <div className="kf-revele mx-auto max-w-2xl">
            <h2 id="titre-rejoindre" className="font-titre text-2xl font-bold md:text-3xl">
              Participez au pilote d’Abidjan
            </h2>
            <p className="mt-3 text-muted-foreground">
              Propriétaires, agences ou chercheurs : rejoignez les premiers membres de Keyli, accompagnés par l’équipe.
            </p>
            <Link
              to="/pilote"
              className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Rejoindre le pilote
            </Link>
          </div>
        </ZoneRevele>
      </section>

      {/* Contact */}
      <section className="border-t bg-secondary py-14" aria-labelledby="titre-contact">
        <ZoneRevele className="container">
          <div className="kf-revele mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
            <h2 id="titre-contact" className="font-titre text-2xl font-bold md:text-3xl">
              Une question ?
            </h2>
            <p className="text-muted-foreground">
              Consultez l’
              <Link to="/aide" className="font-semibold text-primary-glow hover:underline">
                aide
              </Link>{' '}
              ou écrivez-nous.
            </p>
            <a
              href={`mailto:${EMAIL_CONTACT}`}
              className="inline-flex items-center gap-2 font-semibold text-primary-glow hover:underline"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {EMAIL_CONTACT}
            </a>
          </div>
        </ZoneRevele>
      </section>
    </>
  )
}
