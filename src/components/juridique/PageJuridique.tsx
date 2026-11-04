import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DATE_VERSION_CGU } from '@/lib/juridique'

export interface SectionJuridique {
  id: string
  titre: string
  contenu: ReactNode
}

// Gabarit commun des pages légales : titre, date de version, sommaire
// cliquable, sections numérotées, liens vers les autres pages légales.
export function PageJuridique({
  titre,
  introduction,
  sections,
}: {
  titre: string
  introduction?: ReactNode
  sections: SectionJuridique[]
}) {
  return (
    <article className="container max-w-3xl py-10">
      <header className="kf-revele">
        <h1 className="text-3xl font-bold">{titre}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Version en vigueur au {DATE_VERSION_CGU}</p>
        {introduction && <div className="mt-4 text-muted-foreground">{introduction}</div>}
      </header>

      {sections.length > 3 && (
        <nav aria-label="Sommaire" className="mt-8 rounded-lg border bg-secondary/40 p-4">
          <p className="text-sm font-semibold">Sommaire</p>
          <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-primary-glow hover:underline">
                  {i + 1}. {s.titre}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mt-8 space-y-8">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold">
              {i + 1}. {s.titre}
            </h2>
            <div className="mt-3 space-y-3 leading-relaxed [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
              {s.contenu}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t pt-6 text-sm">
        <Link to="/conditions" className="text-primary-glow hover:underline">
          Conditions générales
        </Link>
        <Link to="/confidentialite" className="text-primary-glow hover:underline">
          Confidentialité
        </Link>
        <Link to="/mentions-legales" className="text-primary-glow hover:underline">
          Mentions légales
        </Link>
        <Link to="/aide" className="text-primary-glow hover:underline">
          Aide
        </Link>
      </footer>
    </article>
  )
}
