import { useState } from 'react'
import { Pencil, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { useActiverChambre, useEnregistrerChambre, useTypesChambres, type SaisieChambre } from '@/hooks/useReservations'
import { messageErreur } from '@/lib/erreurs'
import { formatXof } from '@/lib/format'
import { pluriel } from '@/lib/sejour'
import { cn } from '@/lib/utils'

const VIDE: SaisieChambre = { nom: '', description: '', quantite: 1, prix_nuit: 0, voyageurs_max: 2 }

// Types de chambres d'un hôtel ou d'une auberge (Mes annonces). Une chambre
// déjà réservée ne se supprime pas : on la désactive. Le prix « à partir
// de » de l'annonce suit la chambre active la moins chère (trigger en base).
export function GestionChambres({ propertyId }: { propertyId: string }) {
  const chambres = useTypesChambres(propertyId, true)
  const enregistrer = useEnregistrerChambre(propertyId)
  const activer = useActiverChambre(propertyId)
  const [edition, setEdition] = useState<{ id?: string; valeurs: SaisieChambre } | null>(null)

  const valider = (e: React.FormEvent) => {
    e.preventDefault()
    if (!edition) return
    enregistrer.mutate({ id: edition.id, ...edition.valeurs }, { onSuccess: () => setEdition(null) })
  }

  return (
    <div className="space-y-3">
      {chambres.isError && <Alert variant="erreur">{messageErreur(chambres.error)}</Alert>}
      {chambres.data?.length === 0 && !edition && (
        <Alert>Ajoutez au moins un type de chambre : sans chambre, votre établissement ne peut pas être réservé.</Alert>
      )}
      <ul className="space-y-2">
        {chambres.data?.map((c) => (
          <li
            key={c.id}
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3',
              !c.actif && 'opacity-60',
            )}
          >
            <div className="min-w-0">
              <p className="font-semibold">
                {c.nom} {!c.actif && <span className="text-xs font-normal text-muted-foreground">(désactivée)</span>}
              </p>
              <p className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{formatXof(Number(c.prix_nuit))} / nuit</span>
                <span>{pluriel(c.quantite, 'chambre')}</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {c.voyageurs_max} max
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setEdition({
                    id: c.id,
                    valeurs: {
                      nom: c.nom,
                      description: c.description ?? '',
                      quantite: c.quantite,
                      prix_nuit: Number(c.prix_nuit),
                      voyageurs_max: c.voyageurs_max,
                    },
                  })
                }
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Modifier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={activer.isPending}
                onClick={() => activer.mutate({ id: c.id, actif: !c.actif })}
              >
                {c.actif ? 'Désactiver' : 'Réactiver'}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {edition ? (
        <form onSubmit={valider} className="space-y-3 rounded-lg border bg-secondary/50 p-4">
          <p className="font-semibold">{edition.id ? 'Modifier le type de chambre' : 'Nouveau type de chambre'}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ libelle="Nom" id="chambre-nom">
              <Input
                id="chambre-nom"
                required
                maxLength={80}
                placeholder="Double standard, Suite, Dortoir…"
                value={edition.valeurs.nom}
                onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, nom: e.target.value } })}
              />
            </Champ>
            <Champ libelle="Prix par nuit (XOF)" id="chambre-prix">
              <Input
                id="chambre-prix"
                required
                type="number"
                min={1}
                step={500}
                value={edition.valeurs.prix_nuit || ''}
                onChange={(e) =>
                  setEdition({ ...edition, valeurs: { ...edition.valeurs, prix_nuit: Number(e.target.value) } })
                }
              />
            </Champ>
            <Champ libelle="Nombre de chambres de ce type" id="chambre-quantite">
              <Input
                id="chambre-quantite"
                required
                type="number"
                min={1}
                max={500}
                value={edition.valeurs.quantite}
                onChange={(e) =>
                  setEdition({ ...edition, valeurs: { ...edition.valeurs, quantite: Number(e.target.value) } })
                }
              />
            </Champ>
            <Champ libelle="Voyageurs par chambre" id="chambre-voyageurs">
              <Input
                id="chambre-voyageurs"
                required
                type="number"
                min={1}
                max={20}
                value={edition.valeurs.voyageurs_max}
                onChange={(e) =>
                  setEdition({ ...edition, valeurs: { ...edition.valeurs, voyageurs_max: Number(e.target.value) } })
                }
              />
            </Champ>
          </div>
          <Champ libelle="Description (facultatif)" id="chambre-description">
            <textarea
              id="chambre-description"
              rows={2}
              maxLength={500}
              placeholder="Lit double, climatisation, salle d’eau privée…"
              value={edition.valeurs.description}
              onChange={(e) => setEdition({ ...edition, valeurs: { ...edition.valeurs, description: e.target.value } })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Champ>
          {enregistrer.isError && <Alert variant="erreur">{messageErreur(enregistrer.error)}</Alert>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={enregistrer.isPending}>
              {enregistrer.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEdition(null)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setEdition({ valeurs: VIDE })}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          Ajouter un type de chambre
        </Button>
      )}
    </div>
  )
}

function Champ({ libelle, id, children }: { libelle: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {libelle}
      </label>
      {children}
    </div>
  )
}
