import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Home, LayoutGrid, MessageSquare, Search, UserRound } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { LeadPipeline } from '@/components/dashboard/LeadPipeline'
import { DonutChart } from '@/components/dashboard/DonutChart'
import { InsightCard } from '@/components/dashboard/InsightCard'
import { PerformanceEquipe } from '@/components/dashboard/PerformanceEquipe'
import { PeriodeSelecteur } from '@/components/dashboard/PeriodeSelecteur'
import { AgendaList } from '@/components/dashboard/AgendaList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMessagesNonLus } from '@/hooks/useMessagerie'
import { useVisitesAVenir } from '@/hooks/useTableauDeBord'
import {
  useActiverAgent,
  useAjouterAgent,
  useAssignerAgentLead,
  useChangerEtapeLead,
  useConseilsAgence,
  useIndicateursAgence,
  usePerformanceEquipe,
  usePipelineLeads,
} from '@/hooks/useAgence'
import type { Profil } from '@/hooks/useProfil'
import { messageErreur } from '@/lib/erreurs'
import { variationPct } from '@/lib/dashboard'
import { cheminConversation } from '@/lib/messagerie'

const PERIODES = [7, 30, 90]

// Dashboard Agence (KEYLI_DASHBOARD_DESIGN_SPEC.md §3.1), données réelles.
// Pipeline : étape et agent changés par menu (décision du 2026-10-30).
// Conseils : 3 règles fixes validées par le porteur le 2026-10-31.
export default function AgencyDashboard({ profil }: { profil: Profil }) {
  const [jours, setJours] = useState(30)
  const nonLus = useMessagesNonLus().data ?? 0
  const indicateurs = useIndicateursAgence(jours)
  const pipeline = usePipelineLeads()
  const equipe = usePerformanceEquipe(jours)
  const conseils = useConseilsAgence()
  const visites = useVisitesAVenir(5)
  const changerEtape = useChangerEtapeLead()
  const assigner = useAssignerAgentLead()
  const ajouterAgent = useAjouterAgent()
  const activerAgent = useActiverAgent()
  const [nouvelAgent, setNouvelAgent] = useState('')

  const i = indicateurs.data
  const nom = profil.nom_agence || [profil.first_name, profil.last_name].filter(Boolean).join(' ') || 'Mon agence'
  const agentsActifs = (equipe.data ?? []).filter((a) => a.actif).map((a) => ({ id: a.agent_id, nom: a.nom }))
  const leadEnCours = changerEtape.isPending
    ? changerEtape.variables?.id
    : assigner.isPending
      ? assigner.variables?.id
      : null
  const erreurAction = changerEtape.error ?? assigner.error ?? activerAgent.error

  const ajouter = (e: FormEvent) => {
    e.preventDefault()
    if (!nouvelAgent.trim()) return
    ajouterAgent.mutate(nouvelAgent, { onSuccess: () => setNouvelAgent('') })
  }

  return (
    <DashboardShell
      navigation={{
        variante: 'sombre',
        sections: [
          {
            entrees: [
              { vers: '/tableau-de-bord', libelle: "Vue d'ensemble", icone: LayoutGrid, fin: true },
              { vers: '/annonces', libelle: 'Annonces', icone: Home },
              { vers: '/messages', libelle: 'Messages', icone: MessageSquare, badge: nonLus || undefined },
              { vers: '/recherche', libelle: 'Rechercher', icone: Search },
            ],
          },
          {
            titre: 'Compte',
            entrees: [
              { vers: '/abonnement', libelle: 'Facturation', icone: CreditCard },
              { vers: '/profil', libelle: 'Paramètres', icone: UserRound },
            ],
          },
        ],
      }}
      barre={{ nom, role: 'Compte Agence', photo: profil.photo_url }}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bonjour {profil.first_name || nom}</h1>
            <p className="text-sm text-muted-foreground">
              Activité de {nom} sur les {jours} derniers jours.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PeriodeSelecteur periodes={PERIODES} valeur={jours} onChange={setJours} />
            <Button asChild>
              <Link to="/annonces/nouvelle">Publier une annonce</Link>
            </Button>
          </div>
        </div>

        {indicateurs.isError && <p className="text-sm text-destructive">Impossible de charger vos indicateurs.</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            libelle="Annonces actives"
            nombre={i ? i.annonces_actives : null}
            detail={i ? `${i.annonces_verifiees} vérifiée${i.annonces_verifiees > 1 ? 's' : ''}` : undefined}
            rang={0}
          />
          <KpiCard
            libelle={`Vues (${jours} j)`}
            nombre={i ? i.vues : null}
            serie={i?.serie_vues}
            variation={i ? enPct(variationPct(i.vues, i.vues_prec)) : null}
            rang={1}
          />
          <KpiCard
            libelle="Leads actifs"
            nombre={i ? i.leads_actifs : null}
            detail={
              i
                ? `${i.leads_nouveaux} reçu${i.leads_nouveaux > 1 ? 's' : ''} · ${i.leads_conclus} conclu${i.leads_conclus > 1 ? 's' : ''} sur ${jours} j`
                : undefined
            }
            variation={i ? enPct(variationPct(i.leads_nouveaux, i.leads_nouveaux_prec)) : null}
            rang={2}
          />
          <KpiCard
            libelle="Note moyenne"
            nombre={i?.note_moyenne ?? null}
            formater={(n) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5`}
            detail={i ? (i.nb_avis ? `${i.nb_avis} avis` : 'Pas encore d’avis') : undefined}
            rang={3}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section id="pipeline" className="scroll-mt-32 rounded-lg border bg-card p-5 xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Pipeline des leads</h2>
              {erreurAction && <p className="text-xs text-destructive">{messageErreur(erreurAction)}</p>}
            </div>
            {pipeline.isPending ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : (
              <LeadPipeline
                leads={(pipeline.data ?? []).map((l) => ({
                  id: l.id,
                  contact: l.contact,
                  bien: l.bien,
                  etape: l.etape,
                  derniereActivite: l.derniere_activite,
                  agent: l.agent,
                  agentId: l.agent_id,
                  vers: l.contact_user_id
                    ? cheminConversation({ property_id: l.property_id, interlocuteur: l.contact_user_id })
                    : null,
                }))}
                leadEnCours={leadEnCours}
                onChangerEtape={(id, etape) => changerEtape.mutate({ id, etape })}
                agents={agentsActifs}
                onAssigner={(id, agentId) => assigner.mutate({ id, agentId })}
              />
            )}
          </section>
          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-semibold">Statut des annonces</h2>
            {i && (
              <DonutChart
                titreCentre="annonces"
                segments={[
                  { libelle: 'Vérifiées', valeur: i.annonces_verifiees, couleur: 'hsl(var(--success))' },
                  {
                    libelle: 'En attente de vérification',
                    valeur: i.annonces_en_attente,
                    couleur: 'hsl(var(--pending))',
                  },
                  { libelle: 'Archivées', valeur: i.annonces_archivees, couleur: 'hsl(var(--muted-foreground))' },
                ]}
              />
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {(conseils.data ?? []).map((c, rang) => (
            <InsightCard
              key={c.regle}
              type={c.type as 'warn' | 'ok' | 'neutre'}
              titre={c.titre}
              texte={c.texte}
              action={
                c.action_libelle && c.action_vers ? { libelle: c.action_libelle, vers: c.action_vers } : undefined
              }
              rang={rang}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="space-y-4 rounded-lg border bg-card p-5 xl:col-span-2">
            <h2 className="font-semibold">Performance de l'équipe ({jours} j)</h2>
            <PerformanceEquipe
              lignes={(equipe.data ?? []).map((a) => ({
                id: a.agent_id,
                nom: a.nom,
                actif: a.actif,
                annonces: a.annonces,
                leads: a.leads,
                conclus: a.conclus,
                conversion: a.conversion,
                note: a.note === null ? null : Number(a.note),
                nbAvis: a.nb_avis,
              }))}
              onActiver={(id, actif) => activerAgent.mutate({ id, actif })}
              vide="Ajoutez vos agents pour leur attribuer des leads et suivre leurs résultats."
            />
            <form onSubmit={ajouter} className="flex flex-wrap gap-2">
              <label htmlFor="nouvel-agent" className="sr-only">
                Nom du nouvel agent
              </label>
              <Input
                id="nouvel-agent"
                value={nouvelAgent}
                onChange={(e) => setNouvelAgent(e.target.value)}
                placeholder="Nom de l'agent"
                maxLength={80}
                className="max-w-xs"
              />
              <Button type="submit" variant="outline" disabled={ajouterAgent.isPending || !nouvelAgent.trim()}>
                Ajouter un agent
              </Button>
              {ajouterAgent.error && (
                <p className="w-full text-xs text-destructive">{messageErreur(ajouterAgent.error)}</p>
              )}
            </form>
          </section>
          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-2 font-semibold">Visites à venir</h2>
            <AgendaList
              rendezVous={(visites.data ?? []).map((v) => ({
                id: v.id,
                date: v.scheduled_at,
                titre: v.titre,
                detail: v.nom,
                annule: v.status === 'annulee',
                vers: v.interlocuteur
                  ? cheminConversation({ property_id: v.property_id, interlocuteur: v.interlocuteur })
                  : undefined,
              }))}
            />
          </section>
        </div>
      </div>
    </DashboardShell>
  )
}

const enPct = (v: number | null) => (v === null ? null : { valeur: v, unite: '%' })
