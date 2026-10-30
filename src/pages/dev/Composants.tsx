import { useParams, useSearchParams } from 'react-router-dom'
import { BarChart3, CreditCard, Home, LayoutGrid, Settings, Users, UserRound } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { DonutChart } from '@/components/dashboard/DonutChart'
import { TrendBar } from '@/components/dashboard/TrendBar'
import { VerificationStepper } from '@/components/dashboard/VerificationStepper'
import { InsightCard } from '@/components/dashboard/InsightCard'
import { AgendaList } from '@/components/dashboard/AgendaList'
import { MessagePreviewList } from '@/components/dashboard/MessagePreviewList'

// Dates fictives relatives à maintenant (la vitrine reste lisible quel que soit le jour)
const dans = (heures: number) => new Date(Date.now() + heures * 3600_000).toISOString()

// Vitrine des composants de dashboard — DÉVELOPPEMENT UNIQUEMENT (route
// déclarée seulement si import.meta.env.DEV, absente du build de production).
// Sert à tester le cadre et les composites isolément avant l'assemblage des
// pages (semaines 16-17). Valeurs fictives : jamais de données réelles ici.
const BASE = '/dev/composants'

export default function Composants() {
  const { section = 'vue' } = useParams()
  const [parametres] = useSearchParams()
  const variante = parametres.get('variante') === 'claire' ? 'claire' : 'sombre'
  const q = `?variante=${variante}`

  return (
    <DashboardShell
      navigation={{
        variante,
        sections: [
          {
            entrees: [
              { vers: `${BASE}/vue${q}`, libelle: 'Vue d\'ensemble', icone: LayoutGrid },
              { vers: `${BASE}/annonces${q}`, libelle: 'Annonces', icone: Home },
              { vers: `${BASE}/leads${q}`, libelle: 'Leads', icone: UserRound, badge: 5 },
              { vers: `${BASE}/analytics${q}`, libelle: 'Analytics', icone: BarChart3 },
              { vers: `${BASE}/equipe${q}`, libelle: 'Équipe', icone: Users },
              { vers: `${BASE}/facturation${q}`, libelle: 'Facturation', icone: CreditCard },
            ],
          },
          { titre: 'Compte', entrees: [{ vers: `${BASE}/parametres${q}`, libelle: 'Paramètres', icone: Settings }] },
        ],
      }}
      barre={{
        nom: 'Agence Démo Habitat',
        role: 'Compte Agence',
        recherche: { placeholder: 'Rechercher une annonce, un lead…', onRecherche: () => undefined },
      }}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vitrine des composants</h1>
          <p className="text-sm text-muted-foreground">
            Section « {section} » — variante {variante} (ajouter ?variante=claire ou sombre).
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard libelle="Annonces actives" nombre={34} variation={{ valeur: 8, unite: '%' }} rang={0} />
          <KpiCard
            libelle="Vues (30 j)"
            nombre={2840}
            variation={{ valeur: 14, unite: '%' }}
            serie={[120, 140, 90, 160, 180, 150, 210, 230]}
            rang={1}
          />
          <KpiCard libelle="Leads actifs" nombre={12} variation={{ valeur: -3, unite: '%' }} rang={2} />
          <KpiCard
            libelle="Note moyenne"
            nombre={4.6}
            formater={(n) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5`}
            variation={{ valeur: 0 }}
            rang={3}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-semibold">Statut des annonces</h2>
            <DonutChart
              titreCentre="annonces"
              segments={[
                { libelle: 'Vérifiées', valeur: 24, couleur: 'hsl(var(--success))' },
                { libelle: 'En attente', valeur: 7, couleur: 'hsl(var(--pending))' },
                { libelle: 'Archivées', valeur: 3, couleur: 'hsl(var(--muted-foreground))' },
              ]}
            />
          </section>
          <section className="space-y-4 rounded-lg border bg-card p-5">
            <h2 className="font-semibold">Tendance des prix par quartier</h2>
            <TrendBar libelle="Cocody — Angré" pourcentage={72} valeurAffichee="+12 %" rang={0} />
            <TrendBar libelle="Marcory" pourcentage={45} valeurAffichee="+4 %" rang={1} />
            <TrendBar libelle="Yopougon" pourcentage={28} valeurAffichee="−2 %" couleur="hsl(var(--pending))" rang={2} />
          </section>
        </div>

        <h2 className="pt-2 text-lg font-semibold">Composites (semaine 14)</h2>
        <section className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 font-semibold">Statut de vérification</h3>
          <VerificationStepper
            etapes={[
              { libelle: 'Identité', etat: 'fait' },
              { libelle: 'Document du bien', etat: 'fait' },
              { libelle: 'Validation admin', etat: 'en_cours' },
              { libelle: 'Vérifié', etat: 'a_faire' },
            ]}
            note="Votre ACD est en cours d'examen par l'équipe Keyli."
          />
        </section>
        <div className="grid gap-4 lg:grid-cols-3">
          <InsightCard type="warn" titre="Prix au-dessus du quartier" texte="2 annonces sont 15 % au-dessus du prix moyen de leur quartier." action={{ libelle: 'Voir les annonces', vers: '#' }} rang={0} />
          <InsightCard type="neutre" titre="Quartier recherché" texte="Les recherches sur Angré ont augmenté cette semaine." rang={1} />
          <InsightCard type="ok" titre="Réponse rapide" texte="Vous répondez en moins de 2 h : continuez ainsi." rang={2} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border bg-card p-5">
            <h3 className="mb-2 font-semibold">Visites à venir</h3>
            <AgendaList
              rendezVous={[
                { id: '1', date: dans(20), titre: 'Villa Cocody', detail: 'Visiteur démo A', vers: '#' },
                { id: '2', date: dans(50), titre: 'Studio Marcory', detail: 'Visiteur démo B' },
                { id: '3', date: dans(80), titre: 'Duplex Riviera', detail: 'Visiteur démo C', annule: true },
              ]}
            />
          </section>
          <section className="rounded-lg border bg-card p-5">
            <h3 className="mb-2 font-semibold">Messages</h3>
            <MessagePreviewList
              messages={[
                { id: '1', nom: 'Contact Démo Un', apercu: 'Bonjour, la visite est-elle possible samedi ?', date: dans(-2), nouveau: true, vers: '#' },
                { id: '2', nom: 'Contact Démo Deux', apercu: 'Merci pour votre retour rapide.', date: dans(-30), nouveau: false, vers: '#' },
              ]}
            />
          </section>
        </div>
      </div>
    </DashboardShell>
  )
}
