import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bath, BedDouble, Home, MapPin, Ruler, Sofa } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VerifiedBadge } from '@/components/VerifiedBadge'
import { FormulaireContact } from '@/components/annonce/FormulaireContact'
import { BoutonFavori } from '@/components/annonce/BoutonFavori'
import { BoutonSignaler } from '@/components/annonce/BoutonSignaler'
import { BoutonPartager } from '@/components/annonce/BoutonPartager'
import { GaleriePhotos } from '@/components/annonce/GaleriePhotos'
import { ReservationSejour } from '@/components/reservation/ReservationSejour'
import { Etoiles } from '@/components/avis/Etoiles'
import { ListeAvis } from '@/components/avis/ListeAvis'
import { useSession } from '@/hooks/useSession'
import { useFicheAnnonce, useVueAnnonce } from '@/hooks/useRecherche'
import { messageErreur } from '@/lib/erreurs'
import { formatDate, formatXof } from '@/lib/format'
import { LIBELLES_TYPE } from '@/lib/validation'
import { pluriel } from '@/lib/sejour'
import { TexteCinema } from '@/components/animation/TexteCinema'
import { useTitrePage } from '@/hooks/useTitrePage'
import { AnnoncesSimilaires } from '@/components/annonce/AnnoncesSimilaires'
import { BandeauContactMobile } from '@/components/annonce/BandeauContactMobile'

// Sources acceptées par la base (property_interactions_keyli) ; « favoris »
// est enregistré comme un lien direct
const SOURCES = ['search', 'map', 'recommandation', 'lien_direct', 'quartier_tendance']

// Fiche publique d'une annonce : caractéristiques, avantages, annonceur
// (profil public, jamais ses coordonnées) et contact par la messagerie Keyli.
export default function FicheAnnonce() {
  const { id } = useParams()
  const [parametres] = useSearchParams()
  const source = parametres.get('source')
  const { session } = useSession()
  const fiche = useFicheAnnonce(id)
  // Titre de l'onglet et description (l'aperçu des réseaux sociaux est
  // produit côté serveur : functions/annonce/[id].ts)
  useTitrePage(fiche.data?.annonce.title, fiche.data?.annonce.description?.slice(0, 155))
  useVueAnnonce(fiche.data?.annonce.id, source && SOURCES.includes(source) ? source : 'lien_direct')

  if (fiche.isPending) return <p className="container py-16 text-center text-muted-foreground">Chargement…</p>
  if (fiche.isError) {
    return (
      <section className="container py-12">
        <Alert variant="erreur">{messageErreur(fiche.error)}</Alert>
      </section>
    )
  }
  if (!fiche.data) {
    return (
      <section className="container py-16 text-center">
        <p className="font-medium">Cette annonce n'existe pas ou n'est plus disponible.</p>
        <Link to="/recherche" className="mt-3 inline-block font-semibold text-primary-glow hover:underline">
          Voir les autres annonces
        </Link>
      </section>
    )
  }

  const { annonce: a, annonceur } = fiche.data
  const estProprietaire = session?.user.id === a.owner_id
  const hotelier = a.type === 'hotel' || a.type === 'auberge'
  const reservable = a.sejour_court && a.status === 'a_louer' && !a.archived_at
  const quartier = a.quartiers_keyli
  const lieu = [quartier?.nom, quartier?.communes_keyli?.nom, a.city].filter(Boolean).join(', ')
  const avantages = a.property_avantages_keyli
    .map((pa) => pa.avantages_keyli)
    .filter((v): v is NonNullable<typeof v> => !!v)
    .sort((x, y) => x.ordre - y.ordre)
  const photos = a.property_media_keyli
    .filter((m) => m.media_type === 'image')
    .sort((x, y) => (x.order_index ?? 0) - (y.order_index ?? 0))
  const caracteristiques = [
    { icone: Home, texte: LIBELLES_TYPE[a.type] },
    a.area_m2 !== null && { icone: Ruler, texte: `${a.area_m2} m²` },
    a.rooms !== null && { icone: BedDouble, texte: `${a.rooms} pièce${a.rooms > 1 ? 's' : ''}` },
    a.bathrooms !== null && { icone: Bath, texte: `${a.bathrooms} salle${a.bathrooms > 1 ? 's' : ''} de bain` },
    a.furnished && { icone: Sofa, texte: 'Meublé' },
  ].filter((c): c is { icone: typeof Home; texte: string } => !!c)

  // Bandeau de contact toujours visible sur mobile (Sprint 8)
  const bandeauContact = !estProprietaire && !a.archived_at

  return (
    <>
      <section className="container py-8 md:py-12">
        <Link
          to="/recherche"
          className="mb-5 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          Retour à la recherche
        </Link>

        {a.archived_at && (
          <Alert className="mb-5">Cette annonce est archivée : elle n'apparaît plus dans les recherches.</Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0 space-y-6">
            <GaleriePhotos photos={photos} titre={a.title} />

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-pill bg-secondary px-3 py-1 text-xs font-semibold">
                  {a.status === 'a_louer' ? 'À louer' : 'À vendre'}
                </span>
                {a.is_verified && <VerifiedBadge />}
                <div className="ml-auto flex gap-2">
                  {!a.archived_at && <BoutonPartager propertyId={a.id} titre={a.title} />}
                  {!estProprietaire && <BoutonFavori propertyId={a.id} className="border" />}
                </div>
              </div>
              <TexteCinema className="text-2xl font-bold tracking-tight md:text-3xl" segments={[{ texte: a.title }]} />
              <p className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {lieu}
              </p>
              <p className="text-2xl font-bold">
                {hotelier && <span className="text-base font-normal text-muted-foreground">À partir de </span>}
                {formatXof(Number(a.price))}
                {a.status === 'a_louer' && (
                  <span className="text-base font-normal text-muted-foreground">
                    {a.sejour_court ? ' / nuit' : ' / mois'}
                  </span>
                )}
              </p>
              {a.sejour_court && (
                <p className="inline-flex items-center gap-2 rounded-pill bg-turquoise/15 px-3 py-1 text-xs font-semibold">
                  Séjour court · réservation en ligne
                  {a.nuits_min > 1 && <span className="font-normal">· {pluriel(a.nuits_min, 'nuit')} minimum</span>}
                </p>
              )}
            </div>

            <ul className="flex flex-wrap gap-3">
              {caracteristiques.map(({ icone: Icone, texte }) => (
                <li key={texte} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <Icone className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {texte}
                </li>
              ))}
            </ul>

            {a.description && (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Description</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed">{a.description}</p>
              </div>
            )}

            {avantages.length > 0 && (
              <div className="space-y-4">
                {(
                  [
                    ['equipement', 'Équipements'],
                    ['proximite', 'À proximité'],
                  ] as const
                ).map(([cat, titre]) => {
                  const liste = avantages.filter((v) => v.categorie === cat)
                  return liste.length === 0 ? null : (
                    <div key={cat}>
                      <h2 className="mb-2 text-lg font-semibold">{titre}</h2>
                      <ul className="flex flex-wrap gap-2">
                        {liste.map((v) => (
                          <li key={v.id} className="rounded-pill bg-secondary px-3 py-1.5 text-xs font-medium">
                            {v.libelle}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}

            <div>
              <h2 className="mb-3 text-lg font-semibold">
                Avis sur {annonceur?.role_keyli === 'agency' ? "l'agence" : 'le propriétaire'}
              </h2>
              <ListeAvis userId={a.owner_id} />
            </div>

            <p className="text-xs text-muted-foreground">Publiée le {formatDate(a.created_at ?? '')}</p>
            {!estProprietaire && <BoutonSignaler propertyId={a.id} />}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            {reservable && (
              <ReservationSejour
                propertyId={a.id}
                hotelier={hotelier}
                prixNuit={Number(a.price)}
                nuitsMin={a.nuits_min}
                voyageursMax={a.voyageurs_max}
                estProprietaire={estProprietaire}
              />
            )}
            {annonceur && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {annonceur.role_keyli === 'agency' ? 'Agence' : 'Propriétaire'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {annonceur.nom_affiche}
                    {annonceur.verified && <VerifiedBadge />}
                  </p>
                  {Number(annonceur.rating_avg) > 0 && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Etoiles note={Number(annonceur.rating_avg)} />
                      {Number(annonceur.rating_avg).toFixed(1)} / 5
                    </p>
                  )}
                  {annonceur.membre_depuis && (
                    <p className="text-muted-foreground">Membre depuis {formatDate(annonceur.membre_depuis)}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card id="contact-annonceur" className="scroll-mt-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {reservable ? "Une question pour l'hôte ?" : "Contacter l'annonceur"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {estProprietaire ? (
                  <p className="text-sm text-muted-foreground">C'est votre annonce.</p>
                ) : (
                  <FormulaireContact propertyId={a.id} destinataire={a.owner_id} titreAnnonce={a.title} />
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

      {bandeauContact && (
        <BandeauContactMobile
          propertyId={a.id}
          libelle={reservable ? "Écrire à l'hôte" : 'Contacter'}
          prix={
            <>
              {formatXof(Number(a.price))}
              {a.status === 'a_louer' && (
                <span className="text-sm font-normal text-muted-foreground">
                  {a.sejour_court ? ' / nuit' : ' / mois'}
                </span>
              )}
            </>
          }
        />
      )}

      {!a.archived_at && <AnnoncesSimilaires id={a.id} />}
    </>
  )
}
