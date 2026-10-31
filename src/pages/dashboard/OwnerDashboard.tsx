import { Link } from 'react-router-dom'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { VerificationStepper } from '@/components/dashboard/VerificationStepper'
import { MessagePreviewList } from '@/components/dashboard/MessagePreviewList'
import { AgendaList } from '@/components/dashboard/AgendaList'
import { TrendBar } from '@/components/dashboard/TrendBar'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { Button } from '@/components/ui/button'
import { useConversations } from '@/hooks/useMessagerie'
import { useMesDocuments } from '@/hooks/useVerification'
import { useIndicateursProprietaire, useMesBiensMarche, useVisitesAVenir } from '@/hooks/useTableauDeBord'
import type { Profil } from '@/hooks/useProfil'
import { etapesVerification, pctSigne, variationPct } from '@/lib/dashboard'
import { formatXof } from '@/lib/format'
import { cheminConversation } from '@/lib/messagerie'

// Écart au-delà duquel un prix est signalé (au-dessus ou en dessous du
// prix moyen fiable du quartier). Règle simple et affichée telle quelle.
const SEUIL_ECART = 15

// Dashboard Propriétaire (KEYLI_DASHBOARD_DESIGN_SPEC.md §3.2), données
// réelles. Utilisé aussi par l'agence en attendant son dashboard (sem. 17).
export default function OwnerDashboard({ profil }: { profil: Profil }) {
  const agence = profil.role_keyli === 'agency'
  const indicateurs = useIndicateursProprietaire(30)
  const biens = useMesBiensMarche()
  const conversations = useConversations()
  const documents = useMesDocuments()
  const visites = useVisitesAVenir(5)

  const i = indicateurs.data
  const nom = agence
    ? profil.nom_agence || 'Mon agence'
    : [profil.first_name, profil.last_name].filter(Boolean).join(' ') || 'Mon compte'

  // Bien dont le prix s'écarte le plus du prix moyen de son quartier
  const aRevoir = (biens.data ?? [])
    .filter((b) => b.ecart_pct !== null && Math.abs(Number(b.ecart_pct)) >= SEUIL_ECART)
    .sort((a, b) => Math.abs(Number(b.ecart_pct)) - Math.abs(Number(a.ecart_pct)))[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour {agence ? nom : profil.first_name || ''}</h1>
          <p className="text-sm text-muted-foreground">Vos annonces et vos contacts sur les 30 derniers jours.</p>
        </div>
        <Button asChild>
          <Link to="/annonces/nouvelle">Publier une annonce</Link>
        </Button>
      </div>

      {indicateurs.isError && <p className="text-sm text-destructive-texte">Impossible de charger vos indicateurs.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          libelle="Annonces en ligne"
          nombre={i ? i.annonces_actives : null}
          detail={i ? `${i.annonces_verifiees} vérifiée${i.annonces_verifiees > 1 ? 's' : ''}` : undefined}
          rang={0}
        />
        <KpiCard
          libelle="Vues (30 j)"
          nombre={i ? i.vues : null}
          serie={i?.serie_vues}
          variation={i ? toVariation(variationPct(i.vues, i.vues_prec)) : null}
          rang={1}
        />
        <KpiCard
          libelle="Contacts reçus (30 j)"
          nombre={i ? i.contacts : null}
          variation={i ? toVariation(variationPct(i.contacts, i.contacts_prec)) : null}
          rang={2}
        />
      </div>

      {/* Repère de prix : comparaison au prix moyen du quartier (pas un modèle IA) */}
      <section className="rounded-lg bg-gradient-to-br from-primary to-primary-glow p-5 text-primary-foreground shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Repère de prix</p>
        {aRevoir ? (
          <p className="mt-1 text-lg font-semibold">
            « {aRevoir.titre} » est {pctSigne(Math.abs(Number(aRevoir.ecart_pct))).slice(1)}{' '}
            {Number(aRevoir.ecart_pct) > 0 ? 'au-dessus' : 'en dessous'} du prix moyen de {aRevoir.quartier} (
            {formatXof(Number(aRevoir.prix_moyen))}).
          </p>
        ) : (
          <p className="mt-1 text-lg font-semibold">
            {(biens.data ?? []).some((b) => b.prix_moyen !== null)
              ? 'Vos prix sont dans la moyenne de leur quartier.'
              : 'Les repères apparaîtront dès que vos quartiers compteront assez d’annonces.'}
          </p>
        )}
        <p className="mt-1 text-sm opacity-80">
          Comparaison avec le prix moyen des annonces du même quartier (au moins 5 annonces), recalculé chaque nuit.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 font-semibold">Vérification du compte</h2>
          {documents.isPending ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <VerificationStepper
              etapes={etapesVerification(agence ? 'agency' : 'owner', documents.data ?? [], !!profil.verified)}
              note={
                profil.verified ? (
                  <VerifiedBadge />
                ) : (
                  <Link to="/profil" className="underline">
                    Envoyer ou suivre mes documents
                  </Link>
                )
              }
            />
          )}
        </section>
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
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Mes biens face au quartier</h2>
            <Link to="/annonces" className="text-sm text-muted-foreground hover:underline">
              Gérer
            </Link>
          </div>
          {biens.isPending ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (biens.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune annonce en ligne pour l'instant.</p>
          ) : (
            (biens.data ?? []).slice(0, 6).map((b, rang) => (
              <div key={b.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <Link to={`/annonce/${b.id}`} className="truncate font-medium hover:underline">
                    {b.titre}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {b.vues} vue{b.vues > 1 ? 's' : ''}
                    {b.verifiee && <VerifiedBadge libelle={false} className="text-xs" />}
                  </span>
                </div>
                {b.prix_moyen !== null && b.ecart_pct !== null ? (
                  // 50 % de la barre = prix moyen du quartier
                  <TrendBar
                    libelle={`${formatXof(Number(b.prix))} — moyenne ${b.quartier} ${formatXof(Number(b.prix_moyen))}`}
                    pourcentage={(Number(b.prix) / Number(b.prix_moyen)) * 50}
                    valeurAffichee={pctSigne(b.ecart_pct)}
                    couleur={
                      Math.abs(Number(b.ecart_pct)) < SEUIL_ECART ? 'hsl(var(--success))' : 'hsl(var(--pending))'
                    }
                    rang={rang}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {formatXof(Number(b.prix))} — pas encore de prix moyen{' '}
                    {b.quartier ? `pour ${b.quartier}` : 'pour ce quartier'}
                  </p>
                )}
              </div>
            ))
          )}
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
  )
}

const toVariation = (v: number | null) => (v === null ? null : { valeur: v, unite: '%' })
