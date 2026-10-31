import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CarrouselRecommandations } from '@/components/dashboard/RecommendationCard'
import { CompareTable } from '@/components/dashboard/CompareTable'
import { TrendBar } from '@/components/dashboard/TrendBar'
import { MessagePreviewList } from '@/components/dashboard/MessagePreviewList'
import { AgendaList } from '@/components/dashboard/AgendaList'
import { useConversations } from '@/hooks/useMessagerie'
import { useMesFavoris } from '@/hooks/useFavoris'
import { useBasculerAlerte } from '@/hooks/useAlertes'
import { useMesAlertes, useRecommandations, useTendancesQuartiers, useVisitesAVenir } from '@/hooks/useTableauDeBord'
import type { Profil } from '@/hooks/useProfil'
import { CRITERES_COMPARAISON, libelleAlerte, pctSigne } from '@/lib/dashboard'
import { formatXof } from '@/lib/format'
import { cheminConversation } from '@/lib/messagerie'
import { rechercheDepuisAlerte } from '@/lib/recherche'
import { LIBELLES_TYPE } from '@/lib/validation'
import { cn } from '@/lib/utils'

// Le comparateur se limite à 3 biens pour rester lisible sur mobile
const MAX_COMPARES = 3
// Critères disponibles depuis la liste des favoris (surface et meublé n'y sont pas)
const CRITERES = CRITERES_COMPARAISON.filter((c) => c.cle !== 'surface' && c.cle !== 'meuble')

// Dashboard Chercheur (KEYLI_DASHBOARD_DESIGN_SPEC.md §3.3), données réelles.
// Recommandations : score calculé en base (règle validée le 2026-10-30).
export default function UserDashboard({ profil }: { profil: Profil }) {
  const recos = useRecommandations(10)
  const favoris = useMesFavoris()
  const alertes = useMesAlertes()
  const pauseAlerte = useBasculerAlerte()
  const tendances = useTendancesQuartiers(5)
  const conversations = useConversations()
  const visites = useVisitesAVenir(5)

  // Favoris encore visibles ; sélection du comparateur (3 premiers par défaut)
  const visibles = (favoris.data ?? []).flatMap((f) => (f.annonce ? [f.annonce] : []))
  const [choix, setChoix] = useState<string[] | null>(null)
  const selection = (choix ?? visibles.slice(0, MAX_COMPARES).map((a) => a.id)).filter((id) =>
    visibles.some((a) => a.id === id),
  )
  const basculer = (id: string) =>
    setChoix(
      selection.includes(id)
        ? selection.filter((x) => x !== id)
        : selection.length < MAX_COMPARES
          ? [...selection, id]
          : selection,
    )

  const nouveautes = (alertes.data ?? []).filter((a) => a.actif).reduce((s, a) => s + a.nouvelles, 0)
  const maxPopularite = Math.max(1, ...(tendances.data ?? []).map((t) => t.score_popularite))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonjour {profil.first_name || ''}</h1>
        <p className="text-sm text-muted-foreground">Des annonces choisies d'après vos recherches et vos favoris.</p>
      </div>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Pour vous</h2>
          <Link to="/recherche" className="text-sm text-muted-foreground hover:underline">
            Tout rechercher
          </Link>
        </div>
        {recos.isPending ? (
          <p className="py-4 text-sm text-muted-foreground">Chargement…</p>
        ) : recos.isError ? (
          <p className="py-4 text-sm text-destructive-texte">Impossible de charger les recommandations.</p>
        ) : (
          <CarrouselRecommandations
            recos={(recos.data ?? []).map((r) => ({
              id: r.id,
              titre: r.titre,
              prix: Number(r.prix),
              aLouer: r.statut === 'a_louer',
              lieu: [r.quartier, r.commune && r.commune !== r.quartier ? r.commune : null, r.ville]
                .filter(Boolean)
                .join(', '),
              image: r.image,
              verifiee: r.verifiee,
              pertinence: r.pertinence,
            }))}
            vide="Aucune annonce à vous proposer pour l'instant."
          />
        )}
        {recos.data?.length !== 0 && recos.data?.every((r) => r.pertinence === null) && (
          <p className="text-xs text-muted-foreground">
            Consultez des annonces ou ajoutez des favoris : les suggestions s'adapteront à vos goûts.
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Comparateur</h2>
        {visibles.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label={`Biens à comparer (${MAX_COMPARES} au plus)`}>
            {visibles.map((a) => {
              const actif = selection.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={actif}
                  disabled={!actif && selection.length >= MAX_COMPARES}
                  onClick={() => basculer(a.id)}
                  className={cn(
                    'rounded-pill border px-3 py-1 text-xs font-medium transition-colors duration-150 disabled:opacity-50',
                    actif ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary',
                  )}
                >
                  {a.titre}
                </button>
              )
            })}
          </div>
        )}
        <CompareTable
          criteres={CRITERES}
          biens={visibles
            .filter((a) => selection.includes(a.id))
            .map((a) => ({
              id: a.id,
              titre: a.titre,
              vers: `/annonce/${a.id}`,
              valeurs: {
                prix: `${formatXof(a.prix)}${a.statut === 'a_louer' ? ' / mois' : ''}`,
                quartier:
                  [a.quartier, a.commune && a.commune !== a.quartier ? a.commune : null].filter(Boolean).join(', ') ||
                  a.ville,
                type: LIBELLES_TYPE[a.type],
                pieces: a.pieces,
                verifiee: a.verifiee,
              },
            }))}
          onRetirer={(id) => setChoix(selection.filter((x) => x !== id))}
          vide={
            visibles.length === 0
              ? 'Ajoutez des annonces à vos favoris pour les comparer ici.'
              : 'Choisissez des favoris ci-dessus pour les comparer.'
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Quartiers les plus recherchés</h2>
          {(tendances.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Les tendances apparaîtront après les premières recherches.</p>
          ) : (
            (tendances.data ?? []).map((t, rang) => (
              <TrendBar
                key={t.zone_id}
                libelle={
                  t.communes_keyli?.nom && t.communes_keyli.nom !== t.nom ? `${t.nom} (${t.communes_keyli.nom})` : t.nom
                }
                pourcentage={(t.score_popularite / maxPopularite) * 100}
                valeurAffichee={
                  t.prix_fiable && t.tendance_location_pct !== null
                    ? `loyers ${pctSigne(t.tendance_location_pct)}`
                    : `${t.score_popularite} consultation${t.score_popularite > 1 ? 's' : ''}`
                }
                rang={rang}
              />
            ))
          )}
        </section>
        <section className="rounded-lg border bg-card p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Mes alertes</h2>
            {nouveautes > 0 && (
              <span className="kf-pastille-apparait rounded-pill bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                {nouveautes} nouvelle{nouveautes > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {(alertes.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune alerte pour l'instant.{' '}
              <Link to="/recherche" className="font-semibold text-primary-glow hover:underline">
                Créez-en une depuis la recherche
              </Link>{' '}
              pour être prévenu des nouvelles annonces.
            </p>
          ) : (
            <ul className="divide-y">
              {(alertes.data ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm">
                  <span className={cn('min-w-0', !a.actif && 'text-muted-foreground')}>
                    {libelleAlerte(a.criteres as Record<string, unknown>, a.quartier, a.commune)}
                    {!a.actif && <span> — en pause</span>}
                    <span className="block text-xs text-muted-foreground">
                      {a.nouvelles > 0
                        ? `${a.nouvelles} nouvelle${a.nouvelles > 1 ? 's' : ''} cette semaine`
                        : 'Rien de neuf cette semaine'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs font-semibold">
                    <Link
                      to={rechercheDepuisAlerte(a.criteres as Record<string, unknown>)}
                      className="text-primary-glow hover:underline"
                    >
                      Voir
                    </Link>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                      disabled={pauseAlerte.isPending && pauseAlerte.variables?.id === a.id}
                      onClick={() => pauseAlerte.mutate({ id: a.id, actif: !a.actif })}
                    >
                      {a.actif ? 'Mettre en pause' : 'Réactiver'}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Messages</h2>
            <Link to="/messages" className="text-sm text-muted-foreground hover:underline">
              Tout voir
            </Link>
          </div>
          <MessagePreviewList
            messages={(conversations.data ?? []).slice(0, 4).map((c) => ({
              id: `${c.property_id}-${c.interlocuteur}`,
              nom: c.nom_interlocuteur,
              apercu: c.dernier_message,
              date: c.dernier_envoi,
              nouveau: c.non_lus > 0,
              vers: cheminConversation(c),
            }))}
          />
        </section>
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-2 font-semibold">Mes visites</h2>
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
  )
}
