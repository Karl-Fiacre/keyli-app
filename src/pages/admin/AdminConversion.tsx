import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { useConversion } from '@/hooks/useConversion'
import { messageErreur } from '@/lib/erreurs'
import { formatTaux, tauxConversion } from '@/lib/qualite'
import { LIBELLES_TYPE } from '@/lib/validation'

// Objectif du Sprint 8 (docs/calendrier.md) : +20 % de conversion
// « vue d'annonce → prise de contact » par rapport au pilote.
const OBJECTIF_PCT = 20
// Période de référence par défaut : les 30 jours du pilote précédant
// l'ouverture au grand public (Sprint 7, mise en ligne le 2026-11-07)
const REFERENCE_DEBUT = '2026-10-08'
const REFERENCE_FIN = '2026-11-06'

const jourIso = (d: Date) => d.toISOString().slice(0, 10)
const ilYA = (jours: number) => jourIso(new Date(Date.now() - jours * 86_400_000))

type Ligne = { dimension: string; cle: string | null; visiteurs: number; intentions: number; contacts: number }

// Mesure de la conversion (Sprint 8, docs/MODULES/conversion.md) : taux
// d'une période de référence et d'une période étudiée, écart à l'objectif,
// répartition par commune et par type de bien.
export default function AdminConversion() {
  const [reference, setReference] = useState({ debut: REFERENCE_DEBUT, fin: REFERENCE_FIN })
  const [etudiee, setEtudiee] = useState({ debut: ilYA(29), fin: jourIso(new Date()) })
  const ref = useConversion(reference.debut, reference.fin)
  const cur = useConversion(etudiee.debut, etudiee.fin)

  const total = (lignes?: Ligne[]) => lignes?.find((l) => l.dimension === 'total')
  const tRef = total(ref.data)
  const tCur = total(cur.data)
  const tauxRef = tRef ? tauxConversion(Number(tRef.contacts), Number(tRef.visiteurs)) : null
  const tauxCur = tCur ? tauxConversion(Number(tCur.contacts), Number(tCur.visiteurs)) : null
  const ecart = tauxRef && tauxCur !== null ? (tauxCur / tauxRef - 1) * 100 : null

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Taux = contacts ÷ visiteurs. Visiteurs : personnes (sessions) ayant ouvert une fiche ; intentions : clics sur «
        Contacter » ; contacts : premier message d'un chercheur à l'annonceur pour une annonce. Objectif du calendrier :
        +{OBJECTIF_PCT} % par rapport au pilote.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <ChoixPeriode titre="Période de référence (pilote)" valeur={reference} onChange={setReference} />
        <ChoixPeriode titre="Période étudiée" valeur={etudiee} onChange={setEtudiee} />
      </div>

      {(ref.isError || cur.isError) && <Alert variant="erreur">{messageErreur(ref.error ?? cur.error)}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          libelle="Taux de référence"
          nombre={tauxRef}
          formater={(n) => formatTaux(n)}
          detail={tRef ? `${Number(tRef.contacts)} contacts / ${Number(tRef.visiteurs)} visiteurs` : undefined}
          rang={0}
        />
        <KpiCard
          libelle="Taux de la période étudiée"
          nombre={tauxCur}
          formater={(n) => formatTaux(n)}
          detail={
            tCur
              ? `${Number(tCur.contacts)} contacts / ${Number(tCur.visiteurs)} visiteurs · ${Number(tCur.intentions)} intentions`
              : undefined
          }
          rang={1}
        />
        <KpiCard
          libelle={`Écart (objectif +${OBJECTIF_PCT} %)`}
          nombre={ecart}
          formater={(n) => `${n > 0 ? '+' : ''}${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`}
          detail={
            ecart === null
              ? 'Pas encore de taux de référence mesurable'
              : ecart >= OBJECTIF_PCT
                ? 'Objectif atteint'
                : 'Objectif pas encore atteint'
          }
          rang={2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Repartition
          titre="Par commune (période étudiée)"
          lignes={cur.data?.filter((l) => l.dimension === 'commune')}
          libelle={(cle) => cle ?? '—'}
          chargement={cur.isPending}
        />
        <Repartition
          titre="Par type de bien (période étudiée)"
          lignes={cur.data?.filter((l) => l.dimension === 'type')}
          libelle={(cle) => (cle ? (LIBELLES_TYPE[cle as keyof typeof LIBELLES_TYPE] ?? cle) : '—')}
          chargement={cur.isPending}
        />
      </div>
    </div>
  )
}

function ChoixPeriode({
  titre,
  valeur,
  onChange,
}: {
  titre: string
  valeur: { debut: string; fin: string }
  onChange: (v: { debut: string; fin: string }) => void
}) {
  return (
    <fieldset className="rounded-lg border bg-card p-4">
      <legend className="px-1 text-sm font-semibold">{titre}</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          Du
          <Input
            type="date"
            value={valeur.debut}
            max={valeur.fin}
            onChange={(e) => onChange({ ...valeur, debut: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Au
          <Input
            type="date"
            value={valeur.fin}
            min={valeur.debut}
            onChange={(e) => onChange({ ...valeur, fin: e.target.value })}
          />
        </label>
      </div>
    </fieldset>
  )
}

function Repartition({
  titre,
  lignes,
  libelle,
  chargement,
}: {
  titre: string
  lignes?: Ligne[]
  libelle: (cle: string | null) => string
  chargement: boolean
}) {
  const triees = [...(lignes ?? [])].sort((a, b) => Number(b.visiteurs) - Number(a.visiteurs))
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 font-semibold">{titre}</h2>
      {chargement && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!chargement && triees.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune activité sur la période.</p>
      )}
      {triees.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">{titre.startsWith('Par commune') ? 'Commune' : 'Type'}</th>
              <th className="px-2 py-2 text-right font-medium">Visiteurs</th>
              <th className="px-2 py-2 text-right font-medium">Contacts</th>
              <th className="py-2 pl-2 text-right font-medium">Taux</th>
            </tr>
          </thead>
          <tbody>
            {triees.map((l) => (
              <tr key={l.cle ?? '—'} className="border-b last:border-0">
                <td className="py-2 pr-2">{libelle(l.cle)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{Number(l.visiteurs)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{Number(l.contacts)}</td>
                <td className="py-2 pl-2 text-right font-semibold tabular-nums">
                  {formatTaux(tauxConversion(Number(l.contacts), Number(l.visiteurs)))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
