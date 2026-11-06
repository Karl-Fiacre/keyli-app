import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { TrendBar } from '@/components/dashboard/TrendBar'
import {
  LIBELLES_PRIORITE,
  LIBELLES_PROFIL_PILOTE,
  LIBELLES_STATUT_CANDIDATURE,
  useCandidatures,
  useSuiviCandidature,
  useSuiviPilote,
  type PrioriteCandidature,
  type StatutCandidature,
} from '@/hooks/usePilote'
import { messageErreur } from '@/lib/erreurs'
import { formatDate } from '@/lib/format'
import type { ProfilPilote } from '@/lib/validation'
import { cn } from '@/lib/utils'

const STATUTS: StatutCandidature[] = ['en_attente', 'contacte', 'converti', 'rejete']
const PRIORITES: PrioriteCandidature[] = ['haute', 'moyenne', 'basse']
const champ =
  'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Suivi du pilote (Sprint 5) : entonnoir de démarrage des annonceurs,
// activité terrain et file des candidatures (statut, priorité, note).
export default function AdminPilote() {
  return (
    <div className="space-y-10">
      <SuiviPilote />
      <FileCandidatures />
    </div>
  )
}

function SuiviPilote() {
  const suivi = useSuiviPilote()
  if (suivi.isPending) return <p className="text-muted-foreground">Chargement…</p>
  if (suivi.isError) return <Alert variant="erreur">{messageErreur(suivi.error)}</Alert>
  const s = suivi.data
  const total = Number(s.annonceurs)
  const pct = (n: number | string) => (total > 0 ? (Number(n) / total) * 100 : 0)
  const etapes = [
    { libelle: 'Profil complet', n: s.annonceurs_profil },
    { libelle: 'Pièces envoyées', n: s.annonceurs_documents },
    { libelle: 'Badge « Vérifié »', n: s.annonceurs_verifies },
    { libelle: 'Forfait en cours', n: s.annonceurs_forfait },
    { libelle: 'Annonce publiée', n: s.annonceurs_annonce },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Démarrage des annonceurs</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {total} propriétaire{total > 1 ? 's' : ''} et agence{total > 1 ? 's' : ''} inscrits — part ayant franchi
          chaque étape du parcours.
        </p>
        <div className="space-y-4">
          {etapes.map((e, i) => (
            <TrendBar
              key={e.libelle}
              libelle={e.libelle}
              pourcentage={pct(e.n)}
              valeurAffichee={`${Number(e.n)} / ${total}`}
              couleur="hsl(var(--primary-glow))"
              rang={i}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          libelle="Candidatures en attente"
          nombre={Number(s.candidatures_en_attente)}
          detail={`${Number(s.candidatures_contactees)} contactées · ${Number(s.candidatures_converties)} converties · ${Number(s.candidatures_avec_compte)} avec compte`}
          rang={0}
        />
        <KpiCard
          libelle="Retours en attente"
          nombre={Number(s.retours_en_attente)}
          detail={`${Number(s.retours_total)} retours reçus au total`}
          rang={1}
        />
        <KpiCard
          libelle="Visites effectuées"
          nombre={Number(s.visites_effectuees)}
          detail={`${Number(s.visites_planifiees)} planifiées · ${Number(s.avis)} avis publiés`}
          rang={2}
        />
        <KpiCard
          libelle="Séjours acceptés"
          nombre={Number(s.reservations_acceptees)}
          detail={`${Number(s.reservations_demandees)} demandes en attente`}
          rang={3}
        />
      </div>
    </div>
  )
}

function FileCandidatures() {
  const [statut, setStatut] = useState<StatutCandidature>('en_attente')
  const file = useCandidatures(statut)
  const suivi = useSuiviCandidature()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [priorites, setPriorites] = useState<Record<string, PrioriteCandidature>>({})

  return (
    <section className="space-y-4" aria-labelledby="titre-candidatures">
      <h2 id="titre-candidatures" className="text-lg font-semibold">
        Candidatures au pilote
      </h2>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Statut des candidatures">
        {STATUTS.map((v) => (
          <Button
            key={v}
            size="sm"
            variant={statut === v ? 'default' : 'outline'}
            role="tab"
            aria-selected={statut === v}
            onClick={() => setStatut(v)}
          >
            {LIBELLES_STATUT_CANDIDATURE[v]}
          </Button>
        ))}
      </div>

      {suivi.isError && <Alert variant="erreur">{messageErreur(suivi.error)}</Alert>}
      {file.isPending && <p className="text-muted-foreground">Chargement…</p>}
      {file.isError && <Alert variant="erreur">{messageErreur(file.error)}</Alert>}
      {file.data?.length === 0 && (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune candidature dans cette catégorie.
        </p>
      )}

      <ul className="space-y-4">
        {file.data?.map((c) => {
          const priorite = priorites[c.id] ?? c.priorite ?? 'moyenne'
          const note = notes[c.id] ?? c.note_admin ?? ''
          const enregistrer = (nouveau: StatutCandidature) =>
            suivi.mutate({ id: c.id, statut: nouveau, priorite, note })
          return (
            <li key={c.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {c.profil === 'agence' && c.nom_agence ? `${c.nom_agence} — ` : ''}
                    {c.prenom} {c.nom}
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    {c.profil ? LIBELLES_PROFIL_PILOTE[c.profil as ProfilPilote] : 'Profil non précisé'}
                    {c.commune ? ` · ${c.commune}` : ''}
                    {c.nb_biens !== null ? ` · ${c.nb_biens} bien${c.nb_biens > 1 ? 's' : ''}` : ''}
                    {c.created_at ? ` · ${formatDate(c.created_at)}` : ''}
                  </p>
                  <p className="mt-1 break-words text-sm">
                    <a href={`tel:${c.telephone}`} className="text-primary-glow hover:underline">
                      {c.telephone}
                    </a>
                    {' · '}
                    <a href={`mailto:${c.email}`} className="text-primary-glow hover:underline">
                      {c.email}
                    </a>
                  </p>
                </div>
                {c.compte_cree && (
                  <span className="rounded-pill bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success-texte">
                    Compte créé
                  </span>
                )}
              </div>
              {c.message && <p className="whitespace-pre-line text-sm">{c.message}</p>}
              <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                <div className="space-y-1">
                  <label htmlFor={`priorite-${c.id}`} className="text-sm font-medium">
                    Priorité
                  </label>
                  <select
                    id={`priorite-${c.id}`}
                    value={priorite}
                    onChange={(e) => setPriorites((p) => ({ ...p, [c.id]: e.target.value as PrioriteCandidature }))}
                    className={cn(champ, 'h-10')}
                  >
                    {PRIORITES.map((p) => (
                      <option key={p} value={p}>
                        {LIBELLES_PRIORITE[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor={`note-${c.id}`} className="text-sm font-medium">
                    Note de l’équipe
                  </label>
                  <textarea
                    id={`note-${c.id}`}
                    rows={2}
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                    className={champ}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={suivi.isPending} onClick={() => enregistrer(statut)}>
                  Enregistrer
                </Button>
                {STATUTS.filter((v) => v !== statut).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={v === 'rejete' ? 'ghost' : 'default'}
                    disabled={suivi.isPending}
                    onClick={() => enregistrer(v)}
                  >
                    {v === 'en_attente'
                      ? 'Remettre en attente'
                      : `Marquer ${LIBELLES_STATUT_CANDIDATURE[v].toLowerCase()}`}
                  </Button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
