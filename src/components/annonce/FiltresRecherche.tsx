import type { FiltresRecherche as Filtres } from '@/hooks/useRecherche'
import { useAvantages, useQuartiers, type TypeBien } from '@/hooks/useAnnonces'
import { useCommunes } from '@/hooks/useRecherche'
import { SelecteurAvantages } from '@/components/annonce/SelecteurAvantages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LIBELLES_TYPE, TYPES_BIEN } from '@/lib/validation'
import { cn } from '@/lib/utils'

const champNatif =
  'flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const nombreSaisi = (v: string) => {
  const n = Number(v)
  return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : undefined
}

// Filtres de la recherche. Chaque changement repart de la page 1 ; les prix
// s'appliquent à la sortie du champ (ou sur Entrée) pour ne pas relancer la
// recherche à chaque chiffre tapé.
export function FiltresRecherche({
  filtres: f,
  onChange,
}: {
  filtres: Filtres
  onChange: (f: Filtres) => void
}) {
  const communes = useCommunes()
  const quartiers = useQuartiers()
  const avantages = useAvantages()
  const maj = (partiel: Partial<Filtres>) => onChange({ ...f, ...partiel, page: 1 })

  const nomCommune = communes.data?.find((c) => c.id === f.commune)?.nom
  const quartiersProposes = (quartiers.data ?? []).filter((q) => !nomCommune || q.commune === nomCommune)

  const champPrix = (cle: 'prixMin' | 'prixMax', libelle: string) => (
    <div className="space-y-2">
      <Label htmlFor={`filtre-${cle}`}>{libelle}</Label>
      <Input
        id={`filtre-${cle}`}
        key={`${cle}-${f[cle] ?? ''}`}
        type="number"
        inputMode="numeric"
        min={0}
        step={5000}
        placeholder="XOF"
        defaultValue={f[cle] ?? ''}
        onBlur={(e) => nombreSaisi(e.target.value) !== f[cle] && maj({ [cle]: nombreSaisi(e.target.value) })}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </div>
  )

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Transaction</legend>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              [undefined, 'Tout'],
              ['a_louer', 'À louer'],
              ['a_vendre', 'À vendre'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={l}
              type="button"
              aria-pressed={f.statut === v}
              onClick={() => maj({ statut: v })}
              className={cn(
                'h-10 rounded-lg border text-sm font-medium transition-colors duration-150',
                f.statut === v ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="filtre-type">Type de bien</Label>
        <select
          id="filtre-type"
          className={champNatif}
          value={f.type ?? ''}
          onChange={(e) => maj({ type: (e.target.value || undefined) as TypeBien | undefined })}
        >
          <option value="">Tous les types</option>
          {TYPES_BIEN.map((t) => (
            <option key={t} value={t}>
              {LIBELLES_TYPE[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="filtre-commune">Commune</Label>
          <select
            id="filtre-commune"
            className={champNatif}
            value={f.commune ?? ''}
            onChange={(e) => maj({ commune: e.target.value || undefined, quartier: undefined })}
          >
            <option value="">Toutes</option>
            {(communes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filtre-quartier">Quartier</Label>
          <select
            id="filtre-quartier"
            className={champNatif}
            value={f.quartier ?? ''}
            onChange={(e) => maj({ quartier: e.target.value || undefined })}
          >
            <option value="">Tous</option>
            {quartiersProposes.map((q) => (
              <option key={q.id} value={q.id}>
                {nomCommune ? q.nom : `${q.commune} — ${q.nom}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {champPrix('prixMin', 'Prix minimum')}
        {champPrix('prixMax', 'Prix maximum')}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="filtre-pieces">Pièces (minimum)</Label>
          <select
            id="filtre-pieces"
            className={champNatif}
            value={f.piecesMin ?? ''}
            onChange={(e) => maj({ piecesMin: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">Indifférent</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
                {n === 5 ? ' et plus' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filtre-meuble">Meublé</Label>
          <select
            id="filtre-meuble"
            className={champNatif}
            value={f.meuble === undefined ? '' : f.meuble ? 'oui' : 'non'}
            onChange={(e) => maj({ meuble: e.target.value === '' ? undefined : e.target.value === 'oui' })}
          >
            <option value="">Indifférent</option>
            <option value="oui">Meublé</option>
            <option value="non">Non meublé</option>
          </select>
        </div>
      </div>

      {avantages.data && (
        <SelecteurAvantages
          avantages={avantages.data}
          selection={f.avantages}
          onChange={(ids) => maj({ avantages: ids })}
        />
      )}

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => onChange({ avantages: [], tri: f.tri, page: 1 })}
      >
        Effacer les filtres
      </Button>
    </div>
  )
}
