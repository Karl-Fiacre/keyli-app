import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BedDouble, Home, Images, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { useMesAnnonces } from '@/partage/hooks/useAnnonces'
import { useAbonnementActif } from '@/partage/hooks/useAbonnement'
import { useProfil } from '@/partage/hooks/useProfil'
import { useAttribuerAgentAnnonce, useMesAgents } from '@/partage/hooks/useAgence'
import { dernierDocument, useMesDocuments } from '@/partage/hooks/useVerification'
import { EmplacementDocument } from '@/components/verification/EmplacementDocument'
import { GestionPhotos } from '@/components/annonce/GestionPhotos'
import { GestionChambres } from '@/components/reservation/GestionChambres'
import { urlPhoto } from '@/lib/cloudinary'
import { messageErreur } from '@/partage/lib/erreurs'
import { LIBELLES_TYPE } from '@/partage/lib/validation'
import { formatXof } from '@/partage/lib/format'
import { TexteCinema } from '@/components/animation/TexteCinema'

// Annonces du compte (publiées, masquées, archivées)
export default function MesAnnonces() {
  const annonces = useMesAnnonces()
  const abonnement = useAbonnementActif()
  const etat = useLocation().state as { publiee?: boolean } | null
  // Sans abonnement en cours, la base masque les annonces au public
  const masquees = !abonnement.isPending && !abonnement.data
  // Badge « Vérifié » d'un bien = son ACD approuvé ; dépôt réservé aux
  // propriétaires (règle en base)
  const role = useProfil().data?.role_keyli
  const estProprietaire = role === 'owner'
  // Agence : chaque annonce peut être confiée à un agent interne
  const estAgence = role === 'agency'
  const agents = useMesAgents(estAgence)
  const attribuer = useAttribuerAgentAnnonce()
  const documents = useMesDocuments()
  // Annonce dont le panneau Photos est ouvert
  const [photosOuvertes, setPhotosOuvertes] = useState<string | null>(null)
  const [chambresOuvertes, setChambresOuvertes] = useState<string | null>(null)

  return (
    <section>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TexteCinema className="text-2xl font-bold tracking-tight" segments={[{ texte: 'Mes annonces' }]} />
          <Button asChild>
            <Link to="/annonces/nouvelle">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Publier une annonce
            </Link>
          </Button>
        </div>

        {etat?.publiee && <Alert variant="succes">Annonce publiée : elle est visible dans les recherches.</Alert>}
        {masquees && (
          <Alert variant="erreur">
            Aucun abonnement en cours : vos annonces ne sont pas visibles du public.{' '}
            <Link to="/abonnement" className="font-semibold underline">
              Choisir un forfait
            </Link>
          </Alert>
        )}

        {annonces.isPending && <p className="text-muted-foreground">Chargement…</p>}
        {annonces.isError && <Alert variant="erreur">{messageErreur(annonces.error)}</Alert>}
        {attribuer.isError && <Alert variant="erreur">{messageErreur(attribuer.error)}</Alert>}
        {annonces.data?.length === 0 && (
          <p className="text-muted-foreground">Vous n'avez pas encore publié d'annonce.</p>
        )}

        <ul className="space-y-3">
          {annonces.data?.map((a) => (
            <li key={a.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-secondary">
                      {a.main_image_url ? (
                        <img src={urlPhoto(a.main_image_url, 160, 112)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Home className="m-auto mt-4 h-6 w-6 text-muted-foreground" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {LIBELLES_TYPE[a.type]} · {a.status === 'a_louer' ? 'À louer' : 'À vendre'} ·{' '}
                        {a.quartiers_keyli?.nom ? `${a.quartiers_keyli.nom}, ` : ''}
                        {a.city}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {formatXof(Number(a.price))}
                      {a.status === 'a_louer' && (
                        <span className="font-normal text-muted-foreground">
                          {a.sejour_court ? ' / nuit' : ' / mois'}
                        </span>
                      )}
                    </span>
                    {a.is_verified && <VerifiedBadge />}
                    <span
                      className={
                        a.archived_at || masquees
                          ? 'rounded-pill bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground'
                          : 'rounded-pill bg-success/15 px-3 py-1 text-xs font-semibold text-success-texte'
                      }
                    >
                      {a.archived_at ? 'Archivée' : masquees ? 'Masquée' : 'En ligne'}
                    </span>
                  </div>
                  {!a.archived_at && (
                    <div className="w-full border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-expanded={photosOuvertes === a.id}
                        onClick={() => setPhotosOuvertes((id) => (id === a.id ? null : a.id))}
                      >
                        <Images className="mr-2 h-4 w-4" aria-hidden />
                        {photosOuvertes === a.id ? 'Fermer les photos' : 'Photos'}
                      </Button>
                      {a.sejour_court && (a.type === 'hotel' || a.type === 'auberge') && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="ml-2"
                          aria-expanded={chambresOuvertes === a.id}
                          onClick={() => setChambresOuvertes((id) => (id === a.id ? null : a.id))}
                        >
                          <BedDouble className="mr-2 h-4 w-4" aria-hidden />
                          {chambresOuvertes === a.id ? 'Fermer les chambres' : 'Chambres'}
                        </Button>
                      )}
                      {photosOuvertes === a.id && (
                        <div className="mt-3">
                          <GestionPhotos propertyId={a.id} />
                        </div>
                      )}
                      {chambresOuvertes === a.id && (
                        <div className="mt-3">
                          <GestionChambres propertyId={a.id} />
                        </div>
                      )}
                    </div>
                  )}
                  {estAgence && !a.archived_at && (
                    <div className="flex w-full flex-wrap items-center gap-3 border-t pt-3">
                      <label htmlFor={`agent-${a.id}`} className="text-xs text-muted-foreground">
                        Agent responsable
                      </label>
                      {(agents.data ?? []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Aucun agent :{' '}
                          <Link
                            to="/tableau-de-bord#equipe"
                            className="font-semibold text-primary-glow hover:underline"
                          >
                            ajoutez votre équipe
                          </Link>
                        </span>
                      ) : (
                        <select
                          id={`agent-${a.id}`}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-sm disabled:opacity-60"
                          value={a.agent_id ?? ''}
                          disabled={attribuer.isPending && attribuer.variables?.id === a.id}
                          onChange={(e) => attribuer.mutate({ id: a.id, agentId: e.target.value || null })}
                        >
                          <option value="">Aucun agent</option>
                          {(agents.data ?? [])
                            // Un agent désactivé reste affiché s'il suit encore cette annonce
                            .filter((ag) => ag.actif || ag.id === a.agent_id)
                            .map((ag) => (
                              <option key={ag.id} value={ag.id}>
                                {ag.nom}
                                {ag.actif ? '' : ' (désactivé)'}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  )}
                  {estProprietaire && !a.archived_at && !a.is_verified && (
                    <div className="flex w-full flex-wrap items-center gap-3 border-t pt-3">
                      <span className="text-xs text-muted-foreground">Faire vérifier ce bien (ACD) :</span>
                      <EmplacementDocument
                        compact
                        type="acd"
                        propertyId={a.id}
                        document={dernierDocument(documents.data, 'acd', a.id)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
